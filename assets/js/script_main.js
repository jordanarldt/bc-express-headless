// Main script that handles all javascript functions on the storefront

function toCurrency(n) {
    let a = parseFloat(n).toFixed(2);
    let b = a.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `$${b}`;
}

// function to convert a currency value into a float
function fromCurrency(string) {
    return parseFloat(string.replace("$",""));
}

function updateCartCount() {
    let cookie = Cookies.get("cart_item_count");
    let count = cookie ? cookie : 0;
    let countstr = (count > 1) ? "items" : "item";
    
    $("#cart_items").html(`(${count})`);
    $("#cart-item-count").html(`${count}`);
    $("#cart-item-count-items").html(countstr);
}

function updateCartTotals(obj) { // update cart grand totals with jquery
    $("#cart-subtotal-value").html(toCurrency(obj.base_amount));
    $("#cart-discount-value").html(`-${toCurrency(obj.discount_amount)}`);
    $("#cart-tax-value").html(toCurrency(obj.tax_amount));
    $("#cart-grandtotal-value").html(toCurrency(obj.cart_amount));
}

function updateCartLineItem(itemId, quantity) {
    // update line item total cost when we don't refresh
    let lineItemPrice = $(`.cart-item[data-item-id='${itemId}']`).find("#line-item-price");
    let lineItemTotal = $(`.cart-item[data-item-id='${itemId}']`).find("#line-item-total");
    let newPrice = toCurrency(fromCurrency(lineItemPrice.text()) * quantity);
    lineItemTotal.html(newPrice);

    $(`.cart-item[data-item-id='${itemId}']`).find("input[name='qty']").val(quantity);
}

function ajaxCartItemUpdate(cartId, itemId, itemData, quantity) {
    request = {
        cartId,
        itemId,
        quantity: parseInt(quantity),
        itemData
    };

    $.ajax({
        type: "POST",
        contentType: "application/json",
        url: "/api/cart/update",
        data: JSON.stringify(request),
        dataType: "json",
        beforeSend: function() {
            $("body").append(modals.loading);
        },
        success: function(response) {
            if(quantity == 0) {
                // we don't need to update the cart count or totals if we're removing a product because we refresh the page
                location.reload();
            } else {
                if(!response.outOfStock) { // If there's enough stock for the quantity update
                    updateCartCount();
                    updateCartLineItem(itemId, quantity);
                    updateCartTotals(response.newCartTotals);
                } else {
                    //console.log("Unable to update quantity due to low stock, quantity set to max amount.");
                    createGenericOverlayWarning("There is not enough available stock to add that amount to your cart.");
                    updateCartCount();
                    updateCartLineItem(itemId, response.availableStock);
                    updateCartTotals(response.newCartTotals);
                }
            }
        },
        complete: function() {
            if(quantity != 0) { // don't remove the overlay if we're reloading the page anyways
                $(".loading-overlay").remove();
            }
        },
        error: function(err) {
            console.log(err);
        },
        fail: function() { console.log("Failure updating cart item."); }
    });
}

$(document).ready(function() {
    updateCartCount(); // update cart when page loads

    // product page code

    // quantity input actions
    $("#qtyselector button.form-btn-qty").on("click", function() {
        let q = $(this).parent().children("input[name='qty']"), v = parseInt(q.val()), m = q.attr("max"), o = $(this).attr("data-op");
        v = (o == "inc") ? ((v < m) ? v + 1 : m) : (o == "dec") ? ((v > 1) ? v - 1 : ($(this).parents(".cart-item[data-item-id]").length ? 0 : 1)) : null;
        q.val(v);
        q.change();
    });

    // if the quantity is manually typed, we need to make sure it's between the min and max
    $("input.form-qty-increment[name='qty']").on("change", function() {
        let q = $(this), v = parseInt(q.val()), m = q.attr("max");
        v = (v > 1) ? ((v < m) ? v : m) : ((v < 1) ? ($(this).parents(".cart-item[data-item-id]").length ? 0 : 1) : v);
        q.val(v);
    });

    // product detail tab events
    $(".product-tabs .tab a").on("click", function() {
        if(!$(this).hasClass("is-active")) {
            let targ = $(this).parent(".tab[data-target]").attr("data-target");
            $(".product-tabs .tab.is-active").removeClass("is-active");
            $(this).parent(".tab[data-target]").addClass("is-active");
            $(".product-tab-content.active").removeClass("active");
            $(`.product-tab-content.${targ}`).addClass("active");
        }
    });

    // menu event handling
    $("#navTopMenuButton").on("click", function() {
        //$("#overlayMenu").css("height", $(window).height() - ((stickynav.offset().top + stickynav.height()) - $(window).scrollTop()));
        $("#overlayMenu").stop();
        $("#overlayMenu").animate({
            height: $(window).height() - ((stickynav.offset().top + stickynav.height()) - $(window).scrollTop())
        });

        if(stickynav.hasClass("sticky")) {
            $("#overlayMenu").css({position: "fixed", top: stickynav.height()});
        } else {
            $("#overlayMenu").css({position: "absolute", top: "0px"});
        }

        if($("#overlayMenu").css("display") == "none") {
            $("#navTopMenuButton").addClass("active");
            $("#overlayMenu").css("display", "block");
        } else {
            $("#navTopMenuButton").removeClass("active");
            $("#overlayMenu").stop();
            $("#overlayMenu").animate({
                height: "0px"
            }, function() { $("#overlayMenu").css("display", "none"); });
        }
    });

    // Check for options selections on product forms
    // We will send AJAX requests to my own API endpoint to find the SKU

    let product_form = $("form[data-cart-product-add]");
    let product_id = product_form.children("input[name='product_id']").attr("value");

    let product_form_option = $("form[data-cart-product-add] .form-section[required-option] input[data-choice-parent]");
    //let product_form_modifier = $("form[data-cart-product-add] .form-section:not([required-option]) input[data-choice-parent]");

    // Event handling for when a required option with a SKU is changed
    product_form_option.on("change", function() {
        let a = $(".form-section[required-option] input[data-choice-parent]:checked"); 

        let obj = {
            product_id: product_id,
            attributes: []
        };

        for(let i = 0, len = a.length; i < len; i++) {
            let n = a.eq(i).attr("data-choice-parent");
            let c = a.eq(i).attr("data-choice");

            obj.attributes.push({ "parent": n, "choice": c });
        }

        // only make the API request if all required options are chosen
        if(obj.attributes.length == $(".form-section[required-option]").length) {
            $.ajax({
                type: "POST",
                contentType: "application/json",
                url: "/api/getsku",
                data: JSON.stringify(obj),
                dataType: "json",
                beforeSend: function() {
                    $(".form-add-to-cart-button button").attr("disabled","");
                },
                success: function(response) {
                    $("#sku").html(response.sku);
                    $("input[name='variant_id']").attr("value", response.id);
                    $("span.price").html(toCurrency(response.price));

                    // out of stock message
                    if(!response.instock) {
                        if(!$("#alert-oos.popup").length) {
                            $(".form-qty-section").before(modals.alert_oos);
                            $("#alert-oos.popup").stop();
                            $("#alert-oos.popup").animate({
                                width: "100%",
                                opacity: "1"
                            });
                        }
                        $(".form-add-to-cart-button button").attr("disabled","");
                    } else {
                        $(".form-add-to-cart-button button").removeAttr("disabled");
                        
                        if($("#alert-oos").length) {
                            $("#alert-oos").stop();
                            $("#alert-oos").animate({
                                width: "0",
                                opacity: "0"
                            }, function() { $("#alert-oos").remove(); });
                        }
                    }
                },
                fail: function() { console.log("Error getting SKU from choices"); }
            });
        }
    });

    let alertTimer; // create a timer placeholder for the alert popups to allow us to reset the timer

    // Add to cart handling
    product_form.on("submit", function(e) {
        e.preventDefault();

        // using the serialize function won't send the form data how we want for the attributes,
        // so we will modify the attribute object in the formDataSerialized variable
        // first, we need to convert the serialized string back into an object, hence the .split 
        var formDataSerialized = product_form.serialize().split("&");
        let formObj = {}; // create a placeholder object
        for(let key in formDataSerialized) { // for each key of the formdata object
            // variable=value, split by "=". this returns an array with the key and the value, and we set them
            formObj[formDataSerialized[key].split("=")[0]] = formDataSerialized[key].split("=")[1];
        }
        // the formObj has some keys similar to "attribute%5B257%5D", but we can disregard this completely.
        var formData = {
            action: formObj.action,
            product_id: formObj.product_id,
            variant_id: formObj.variant_id,
            attribute: {},
            qty: formObj.qty
        };

        // for every form item that has the :checked value
        let a = $(".form-section input[data-choice-parent]:checked"); 
        let attrObj = {};
        for(let i = 0, len = a.length; i < len; i++) {
            let n = a.eq(i).attr("data-choice-parent");
            let c = a.eq(i).attr("data-choice") ? a.eq(i).attr("data-choice") : null;
            // we search the data-choice-parent, and data-choice attributes.
            // if the data-choice attribute doesn't exist, it's probably a checked checkbox
            attrObj[n] = c ? c : "checked";
        }
        formData.attribute = attrObj;

        $.ajax({
            type: "POST",
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            url: "/api/cart",
            data: formData,
            dataType: "json",
            beforeSend: function() {
                $(".form-add-to-cart-button button").attr("disabled","");
                $(".form-add-to-cart-button button").text("Adding to cart...");

                if($("#cart-add-popup").length) {
                    $("#cart-add-popup").stop();
                    $("#cart-add-popup").animate({
                        width: "0",
                        opacity: "0"
                    }, function() { $("#cart-add-popup").remove(); });
                }
            },
            success: function(response) {
                //console.log(response);
                if(!$("#cart-add-popup").length) {
                    $(".form-add-to-cart-button").after(modals.alert_add_cart_success);
                    $("#cart-add-popup").stop();
                    $("#cart-add-popup").animate({
                        width: "100%",
                        opacity: "1"
                    });

                    clearInterval(alertTimer); // reset the timer
                    alertTimer = setTimeout(function() {
                        $("#cart-add-popup").stop();
                        $("#cart-add-popup").animate({
                            width: "0",
                            opacity: "0"
                        }, function() { $("#cart-add-popup").remove(); });
                    }, 8000);
                }
            },
            complete: function() {
                $(".form-add-to-cart-button button").removeAttr("disabled");
                $(".form-add-to-cart-button button").text("Add to Cart");

                updateCartCount();
            },
            error: function(err) {
                let responseText = err.responseText ? err.responseText : "Unknown error";

                if($("#alert-error").length) {
                    $("#alert-error").remove();
                }

                $(".form-add-to-cart-button").after(`<div class="alert alert-danger popup" id="alert-error"><span></span>${responseText}</div>`);

                $("#alert-error").stop();
                $("#alert-error").animate({
                    width: "100%",
                    opacity: "1"
                });
                
                clearInterval(alertTimer); // reset the timer
                alertTimer = setTimeout(function() {
                    $("#alert-error").stop();
                    $("#alert-error").animate({
                        width: "0",
                        opacity: "0"
                    }, function() { $("#alert-error").remove(); });
                }, 8000);
            },
            fail: function() { console.log("Error sending the request."); }
        });
    });

    // Cart item update event handling

    // Cart item delete event
    $(".cart-item-remove").on("mouseup", function() {
        let cartId = $(this).parents("table.cart[data-cart-id]").attr("data-cart-id");
        let itemId = $(this).parents("tr.cart-item[data-item-id]").attr("data-item-id");

        createDeleteItemModal(cartId, itemId);
    });

    // Cart quantity update event
    $(".cart-item #qtyselector input[name='qty']").on("change", function() {
        let cartId = $(this).parents("table.cart[data-cart-id]").attr("data-cart-id");
        let itemId = $(this).parents("tr.cart-item[data-item-id]").attr("data-item-id");
        let quantity = $(this).val();
        let itemData = {};

        if($(this).parents("tr.cart-item[data-custom-item]").length) {
            let customItemName = $(this).parents("tr.cart-item[data-custom-item]").find(".cart-item-name").text();
            let customItemSku = $(this).parents("tr.cart-item[data-custom-item]").attr("data-custom-item");
            let customItemListPrice = fromCurrency($(this).parents("tr.cart-item[data-custom-item]").find("#line-item-price").html());
            itemData = {
                itemType: "custom",
                customItemName,
                customItemSku,
                customItemListPrice
            };
        } else if($(this).parents("tr.cart-item[data-product-id]").length) {
            let productId = $(this).parents("tr.cart-item[data-product-id]").attr("data-product-id") ? $(this).parents("tr.cart-item[data-product-id]").attr("data-product-id") : null;

            let productSku = $(`.cart-item[data-item-id='${itemId}']`).find("#line-item-sku").text() ? $(`.cart-item[data-item-id='${itemId}']`).find("#line-item-sku").text() : null;

            itemData = {
                itemType: "product",
                productId,
                productSku
            };
        }
        
        if(quantity == 0) {
            $(this).val(1);
            $(this).change();
            createDeleteItemModal(cartId, itemId, quantity);
        } else {
            ajaxCartItemUpdate(cartId, itemId, itemData, quantity);
        }
    });
});
