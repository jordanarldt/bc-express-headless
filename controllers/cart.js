// controller to handle cart requests
const dataController = require("./storedata");
const BigCommerce = require("node-bigcommerce");

const bigC = new BigCommerce({
    clientId: "g4ptlzmsao82lgphi3g32qdv0aqe9o3",
    accessToken: "en05g50sh7yv5o1eus6rjkxiu13mili",
    secret: "5878b4f8e489bbf63ca3da8ffb2f24693daa2ac7b93b85867c4317014f03e764",
    storeHash: "fwqdx7x1or",
    responseType: "json",
    headers: { 'Accept-Encoding': '*' }, 
    apiVersion: "v3"
});

const cookieMaxAge = ((24 * 60 * 60) * 1000) * 7; // 7 days

function findKeyIndex(array, attr, value) {
    for(let i = 0, len = array.length; i < len; i++) {
        if(array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}

function getTotalCartProducts(line_items_obj) {
    // types of items: physical_items, digital_items, gift_certificates, custom_items
    var { physical_items, digital_items, gift_certificates, custom_items } = line_items_obj;
    var physical_total = 0;
    var digital_total = 0;
    var gift_total = 0;
    var custom_total = 0;
    
    for(let i = 0, len = physical_items.length; i < len; i++) {
        physical_total += physical_items[i].quantity;
    }

    for(let i = 0, len = digital_items.length; i < len; i++) {
        digital_total += digital_items[i].quantity;
    }

    for(let i = 0, len = gift_certificates.length; i < len; i++) {
        gift_total += gift_certificates[i].quantity;
    }

    for(let i = 0, len = custom_items.length; i < len; i++) {
        custom_total += custom_items[i].quantity;
    }

    let total = physical_total + digital_total + gift_total + custom_total;
    return total;
}

// middleware to update the cart counter (if items are added externally somehow, just in case)
function updateCartCounter(req, res, next) { 
    // Check for the cart cookie to see if we have an existing cart
    let cookieCart = req.cookies.bc_cart ? req.cookies.bc_cart : null;
    let cartId = cookieCart ? cookieCart : null;

    if(cartId) {
        getCartData(cartId)
        .then(response => {
            let count = getTotalCartProducts(response.data.line_items);
            res.cookie("cart_item_count", count, { maxAge: cookieMaxAge });
            next();
        })
        .catch(err => {
            if(err.code == 404) {
                console.log("Cart 404. Deleting cart cookie.");
                res.cookie("bc_cart", null, { maxAge: 0 });
                res.cookie("cart_item_count", null, { maxAge: 0 });
                res.redirect(req.path);
            }
            console.log(err);
            next();
        });
    } else {
        res.cookie("cart_item_count", 0, { maxAge: 0 });
        next();
    }
}

function addProductToCart(req, res) {
    console.log(req.body);
    let { action, product_id, variant_id, qty } = req.body;
    let attribute = req.body.attribute ? req.body.attribute : [];

    // Check for authentication cookie to see if we're signed in
    let cookieAuth = req.signedCookies.user_data ? JSON.parse(req.signedCookies.user_data) : null; 
    let customerId = cookieAuth ? cookieAuth.id : null;

    // Check for the cart cookie to see if we have an existing cart
    let cookieCart = req.cookies.bc_cart ? req.cookies.bc_cart : null;
    let cartId = cookieCart ? cookieCart : null;

    // We will make a request to GET the product, including the variant and modifier information to get it all in 1 request
    // We will also check the inventory server-side to ensure that the form can't be force-submitted for an out of stock item
    
    bigC.get(`/catalog/products/${product_id}?include=variants,modifiers`)
    .then(response => {
        let { inventory_tracking } = response.data;
        let product_inventory = response.data.inventory_level;

        console.log(response.data);

        let variants = response.data.variants;
        let vkey = findKeyIndex(variants, "id", parseInt(variant_id));
        let variant_inventory = variants[vkey].inventory_level;

        // Check for product/variant inventory. If the inventory is out, we return (cancel) the function to prevent further code from executing
        if(inventory_tracking === "product") {
            if(product_inventory < qty) {
                res.status(422).send("Not enough inventory for the selected option");
                return;
            }
        } else if(inventory_tracking === "variant") {
            if(variant_inventory < qty) {
                res.status(422).send("Not enough inventory for the selected option");
                return;
            }
        }

        // If the product passes the inventory check

        var request = { line_items: [{ quantity: qty, product_id, variant_id }] };
        if(customerId) { request.customer_id = customerId; }

        let modifiers = response.data.modifiers;

        // functionality to handle modifiers
        if(modifiers) {
            let option_selections = [];
            for(var i = 0, len = modifiers.length; i < len; i++) {
                if(modifiers[i].type === "checkbox") {
                    if(attribute[`${modifiers[i].id}`]) {
                        console.log("CHECKBOX SELECTED");
                        // the option value ID of a checked/unchecked checkbox won't be sent in the request, so we need to loop to find it
                        for(var a = 0, alen = modifiers[i][`option_values`].length; a < alen; a++) {
                            if(modifiers[i][`option_values`][a].value_data[`checked_value`] == true) {
                                console.log("CHECKED VALUE " + modifiers[i].option_values[a].id);
                                let pushdata = {
                                    "option_id": modifiers[i][`option_values`][a].option_id,
                                    "option_value": modifiers[i][`option_values`][a].id
                                }
                                option_selections.push(pushdata);
                            }
                        }
                    } else {
                        console.log("CHECKBOX NOT SELECTED");
                        for(var a = 0, alen = modifiers[i][`option_values`].length; a < alen; a++) {
                            if(modifiers[i][`option_values`][a].value_data[`checked_value`] == false) {
                                console.log("UNCHECKED VALUE " + modifiers[i].option_values[a].id);

                                let pushdata = {
                                    "option_id": modifiers[i][`option_values`][a].option_id,
                                    "option_value": modifiers[i][`option_values`][a].id
                                }
                                option_selections.push(pushdata);
                            }
                        }
                    }
                } else { // else if(modifiers[i].type === "radio_buttons")
                    if(attribute[`${modifiers[i].id}`]) {
                        // Non-checkbox option value IDs will always come through with the request body
                        // if the modifier is not required and not selected, no data will be retrieved and this block of code will not matter in the request to add the product to the cart.
                        let pushdata = {
                            "option_id": modifiers[i].id,
                            "option_value": parseInt(attribute[`${modifiers[i].id}`])
                        }
                        option_selections.push(pushdata);
                    }
                }
                //console.log(modifiers[i].option_values);
            }
            request.line_items[0].option_selections = option_selections;
        }

        console.log(request);
        console.log(request.line_items[0].option_selections);

        if(!cookieCart) { // if cart cookie doesn't exist, create a new cart with the product
            bigC.post("/carts", request)
            .then(response => {
                console.log(response);
                console.log("Response data: " + response.data.id);
                res.cookie("bc_cart", response.data.id, { maxAge: cookieMaxAge });
                res.cookie("cart_item_count", qty, { maxAge: cookieMaxAge });
                res.json({cart_item_count: qty});
            })
            .catch(err => {
                console.log(err);
                let parsedErr = JSON.parse(err.responseBody);

                if(err.code == 422) {
                    if(parsedErr.detail) {
                        res.status(422).send(parsedErr.detail);
                    } else {
                        res.status(422).send("Not enough inventory for the selected option");
                    }
                }
            });
        } else {
            // cart cookie exists, let's add the item to the cart
            console.log("Cart cookie exists");

            bigC.post(`/carts/${cartId}/items`, request)
            .then(response => {
                console.log(response);

                // If the cart customer ID doesn't match the customer Id cookie
                // this might happen if we create a cart as a guest and then sign in later
                if(customerId) {
                    if(response.data.customer_id != customerId) {
                        updateCartCustomerId(cartId, customerId)
                        .then(response => {
                            console.log("Updated cart customer ID");
                        })
                        .catch(err => {
                            console.log(err);
                        });
                    }     
                }

                let cart_qty = getTotalCartProducts(response.data.line_items);
                res.cookie("cart_item_count", cart_qty, { maxAge: cookieMaxAge });
                res.json({cart_item_count: cart_qty});
            })
            .catch(err => {
                console.log(err);
                let parsedErr = JSON.parse(err.responseBody);

                if(err.code == 422) {
                    if(parsedErr.detail) {
                        res.status(422).send(`Error: ${parsedErr.detail}`);
                    } else {
                        res.status(422).send("Not enough inventory for the selected option");
                    }
                }
            });
        }
        //console.log(response.data.modifiers);
    })
    .catch(err => {
        console.log(err);
    });
}

function updateCartProduct(cartId, itemId, request) {
    return new Promise((resolve, reject) => {
        bigC.put(`/carts/${cartId}/items/${itemId}`, request)
        .then(response => {
            let data = response.data;
            let { base_amount, discount_amount, cart_amount } = data;
            let tax_amount = -(base_amount - discount_amount - cart_amount);
    
            let newCartTotals = {
                base_amount,
                discount_amount,
                cart_amount,
                tax_amount
            }
    
            let cartItemCount = getTotalCartProducts(response.data.line_items);
    
            resolve({ newCartTotals, cartItemCount });
        })
        .catch(err => {
            console.log(err);
            reject(err);
        });
    });
}

function updateCartItem(req, res) {
    // add functionality to handle out of stock quantity adjustments
    // if the adjustment is out of stock, we need to set the value on the page to the max stock level
    let cartId = req.body.cartId;
    let itemId = req.body.itemId;
    let quantity = req.body.quantity;
    let itemData = req.body.itemData;

    console.log(req.body);
    var request = {};
    
    if(quantity == 0) {
        bigC.delete(`/carts/${cartId}/items/${itemId}`)
        .then(response => {
            if(response) {
                res.json("Deleted cart line item");
            } else {
                // if the response is null, it means we deleted the last item. We'll need to clear the cookies.
                res.cookie("cart_item_count", null, { maxAge: 0 });
                res.cookie("bc_cart", null, { maxAge: 0 });
                res.json("Cart deleted");
            }
        })
        .catch(err => {
            console.log(err);
        });
    } else {
        if(itemData.itemType === "product") {
            request = {
                line_item: {
                    product_id: itemData.productId,
                    quantity: quantity
                }
            };
        } else if(itemData.itemType === "custom") {
            request = {
                custom_item: {
                    name: itemData.customItemName,
                    sku: itemData.customItemSku,
                    list_price: itemData.customItemListPrice,
                    quantity: quantity
                }
            };
        }

        if(itemData.itemType === "product") { // make sure we're dealing with an actual product
            // Let's check the inventory of the variant before sending the update request.
            // This will make it easier to handle the data via ajax on the page
            if(itemData.productSku) { // If the product has a SKU
                dataController.findVariantInventoryBySku(itemData.productSku)
                .then(response => {
                    // If the product has inventory tracking - this is incase a product has a sku but no inventory tracking
                    if(response.site.product.inventory.aggregated) {
                        let availableStock = response.site.product.inventory.aggregated.availableToSell;
                        //console.log(response);
                        if(availableStock >= quantity) {
                            updateCartProduct(cartId, itemId, request)
                            .then(response => {
                                let { newCartTotals, cartItemCount } = response;
                                res.cookie("cart_item_count", cartItemCount, { maxAge: cookieMaxAge });
                                res.json({ newCartTotals });
                            })
                            .catch(err => {
                                res.status(err.code).send("Error updating product quantity.");
                            });
                        } else {
                            console.log("Not enough stock, update line item to max level of stock.");
                            request.line_item.quantity = availableStock;
                            updateCartProduct(cartId, itemId, request)
                            .then(response => {
                                let { newCartTotals, cartItemCount } = response;
        
                                res.cookie("cart_item_count", cartItemCount, { maxAge: cookieMaxAge });
                                res.json({
                                    newCartTotals,
                                    outOfStock: true,
                                    availableStock
                                });
                            })
                            .catch(err => {
                                res.status(err.code).send("Error updating product quantity.");
                            });
                        }
                    } else {
                        // If the product has a SKU, but no inventory tracking
                        updateCartProduct(cartId, itemId, request)
                        .then(response => {
                            let { newCartTotals, cartItemCount } = response;
                            res.cookie("cart_item_count", cartItemCount, { maxAge: cookieMaxAge });
                            res.json({ newCartTotals });
                        })
                        .catch(err => {
                            res.status(err.code).send("Error updating product quantity.");
                        });
                    }
                })
                .catch(err => {
                    console.log(err);
                });
            } else {
                // If the product has no SKU, let's look for it in GraphQL to see if it has inventory tracking
                dataController.findProductInventoryById(itemData.productId)
                .then(response => {
                    // If the product has inventory tracking
                    if(response.site.product.inventory.aggregated) {
                        let availableStock = response.site.product.inventory.aggregated.availableToSell;

                        if(availableStock >= quantity) {
                            updateCartProduct(cartId, itemId, request)
                            .then(response => {
                                let { newCartTotals, cartItemCount } = response;
                                res.cookie("cart_item_count", cartItemCount, { maxAge: cookieMaxAge });
                                res.json({ newCartTotals });
                            })
                            .catch(err => {
                                res.status(err.code).send("Error updating product quantity.");
                            });
                        } else {
                            console.log("Not enough stock, update line item to max level of stock.");
                            request.line_item.quantity = availableStock;
                            updateCartProduct(cartId, itemId, request)
                            .then(response => {
                                let { newCartTotals, cartItemCount } = response;
        
                                res.cookie("cart_item_count", cartItemCount, { maxAge: cookieMaxAge });
                                res.json({
                                    newCartTotals,
                                    outOfStock: true,
                                    availableStock
                                });
                            })
                            .catch(err => {
                                res.status(err.code).send("Error updating product quantity.");
                            });
                        }
                    } else {
                        // If the product does not have a sku, and does not have inventory tracking
                        updateCartProduct(cartId, itemId, request)
                        .then(response => {
                            let { newCartTotals, cartItemCount } = response;
                            res.cookie("cart_item_count", cartItemCount, { maxAge: cookieMaxAge });
                            res.json({ newCartTotals });
                        })
                        .catch(err => {
                            res.status(err.code).send("Error updating product quantity.");
                        });
                    }
                })
                .catch(err => {
                    res.status(err.code).send("Error updating product quantity.");
                });
            }
        } else if(itemData.itemType === "custom") {
            console.log("Cart update for custom-item");
            updateCartProduct(cartId, itemId, request)
            .then(response => {
                let { newCartTotals, cartItemCount } = response;

                res.cookie("cart_item_count", cartItemCount, { maxAge: cookieMaxAge });
                res.json({ newCartTotals });
            })
            .catch(err => {
                res.status(err.code).send("Error updating product quantity.");
            });
        } else if(itemData.itemType === "giftcert") {
            console.log("Gift certificate item update");
            
        }
    }
}

// declaring these functions in here, so we can reference it without adding the API credentials in a different file
function getCartData(cartId) {
    return bigC.get(`/carts/${cartId}`);
}

function createCartRedirectURL(cartId) {
    return bigC.post(`/carts/${cartId}/redirect_urls`);
}

function updateCartCustomerId(cartId, customerId) {
    return bigC.put(`/carts/${cartId}`, { customer_id: customerId });
}

module.exports = {
    updateCartCounter,
    getTotalCartProducts,
    addProductToCart,
    updateCartItem,
    getCartData,
    createCartRedirectURL,
    updateCartCustomerId
}