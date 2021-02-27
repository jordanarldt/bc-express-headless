// Route to handle page rendering
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const {v4: uuidv4} = require("uuid");

const dataController = require("./storedata");
const cartController = require("./cart");

// Regular store token
//const GQLToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJlYXQiOjE2NDA4MjI0MDAsInN1Yl90eXBlIjoyLCJ0b2tlbl90eXBlIjoxLCJjb3JzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCJdLCJjaWQiOjEsImlhdCI6MTYwODQ0NTMzNSwic3ViIjoia2VjaThzNWZsa3B6cnV4Z2U5NXdqcng1MDVsdmFrNCIsInNpZCI6MTAwMTAwMDAyOSwiaXNzIjoiQkMifQ.IR9GY--jjOio7kOJOiF-a9IxyG5NoH_uVlZiNg1BRui99HifU0rYRF4LluthYwJ_rXXXfVC9dEFJBc1lmMvSPQ";

function index(req, res) {
    res.render("pages/index");
}

function allProducts(req, res) {

  let cookieAuth = req.signedCookies.user_data ? JSON.parse(req.signedCookies.user_data) : null; 
  let customerId = cookieAuth ? cookieAuth.id : null;

  dataController.getAllProductsPaginate(customerId)
  .then(data => {
    res.render("pages/shop-all", { products: data.site.products.edges });
  })
}

function productPath(req, res) {
  var path = escape(`/${req.params.path}`);
  console.log(`product by path: ${path}`);

  let cookieAuth = req.signedCookies.user_data ? JSON.parse(req.signedCookies.user_data) : null; 
  let customerId = cookieAuth ? cookieAuth.id : null;

  dataController.getProductByPath(path, customerId)
  .then(data => {
    // log product data
    console.log(data.site.route.node);

    // If we receive product data
    if(data.site.route.node) {
      var productData = {
          name: data.site.route.node.name,
          id: data.site.route.node.entityId,
          baseVariantId: data.site.route.node.variants.edges[0].node.entityId,
          sku: data.site.route.node.sku,
          details: [],
          custom_fields: [],
          price: data.site.route.node.prices.price.value,
          priceRange: {
            min: data.site.route.node.prices.priceRange.min.value,
            max: data.site.route.node.prices.priceRange.max.value,
          },
          currency: data.site.route.node.prices.price.currencyCode,
          description: data.site.route.node.plainTextDescription,
          defaultimg: data.site.route.node.defaultImage,
          images: data.site.route.node.images.edges
      };

      if(data.site.route.node.width != null) {
        productData.details.push({ name: "Width", value: data.site.route.node.width.value });
      }

      if(data.site.route.node.height != null) {
        productData.details.push({ name: "Height", value: data.site.route.node.height.value });
      }

      if(data.site.route.node.depth != null) {
        productData.details.push({ name: "Depth", value: data.site.route.node.depth.value });
      }

      if(data.site.route.node.weight != null) {
        productData.details.push({ name: "Weight", value: data.site.route.node.weight.value });
      }

      // Get custom field data
      if(data.site.route.node.customFields.edges.length) {
        for(let i = 0, len = data.site.route.node.customFields.edges.length; i < len; i++) {
          let tempObj = {
            name: data.site.route.node.customFields.edges[i].node.name,
            value: data.site.route.node.customFields.edges[i].node.value
          };

          productData.custom_fields.push(tempObj);
        }
      }

      // Gather product options and variants data to generate the options selection form on product page
      //  *** This may be a weird and inefficient way to do this, but it gets the job done ***

      // set up the object to push data to
      var optionsTypes = {};

      // If the product has options
      // We cycle through all of the SKUs and choices to generate the variables to pass to the page
      // With this data, we will use handlebars to generate the options selection form and
      //  associate the correct SKUs and variant IDs to the choices

      if(data.site.route.node.productOptions.edges.length) {
        var tempObj = [];

        for(var i = 0, ilen = data.site.route.node.productOptions.edges.length; i < ilen; i++) {
          var option = data.site.route.node.productOptions.edges[i].node.displayName;

          tempObj.push({
            name: option,
            id: data.site.route.node.productOptions.edges[i].node.entityId,
            type: data.site.route.node.productOptions.edges[i].node.__typename,
            required: data.site.route.node.productOptions.edges[i].node.isRequired,
            optionIds: [],
            choices: []
          });                
        }
        
        optionsTypes['options'] = tempObj;

        var skusArray = [];
        var variantIDArray = [];

        // for each of the variants on the product data returned from GraphQL
        // this will only return the required values that have a SKU
        for(var o = 0, olen = data.site.route.node.variants.edges.length; o < olen; o++) {
          var id = data.site.route.node.variants.edges[o].node.entityId;
          var sku = data.site.route.node.variants.edges[o].node.sku;

          variantIDArray.push(id);
          skusArray.push(sku);

          // For every product variant option
          for(var e = 0, elen = data.site.route.node.variants.edges[o].node.options.edges.length; e < elen; e++) {
            var option = data.site.route.node.variants.edges[o].node.options.edges[e].node.displayName;
            var choice = data.site.route.node.variants.edges[o].node.options.edges[e].node.values.edges[0].node.label;
            var optionId = data.site.route.node.variants.edges[o].node.options.edges[e].node.values.edges[0].node.entityId;
          
            // push the possible required choices into the object, this will create duplicates
            for(var a = 0, alen = optionsTypes['options'].length; a < alen; a++) {
              if(optionsTypes['options'][a].name === option) {
                optionsTypes['options'][a].optionIds.push(optionId);
                optionsTypes['options'][a].choices.push(choice);
              }
            }
          }
        }

        optionsTypes.skus = skusArray;
        optionsTypes.variantIds = variantIDArray;

        // Set the local variables for later use
        req.app.locals.skus = skusArray;
        req.app.locals.variantIds = variantIDArray;

        // we need to do some logic here to figure out if the required option is part of a variant/sku
        // theoretically, we only need to check one variant to get the options associated with SKUS 
        // since there must be a choice for each possible combination.
        // This will allow us to have required modifiers
        let singleVariant = data.site.route.node.variants.edges[0]; // look at one single required variant
        let requiredVariants = []; // create an empty array

        // Loop to go through each type of option associated with the single SKU
        for(let n = 0, nlen = singleVariant.node.options.edges.length; n < nlen; n++) {
          // Push the names to the array
          requiredVariants.push(singleVariant.node.options.edges[n].node.displayName);
        }

        // loop through the object that we created
        for(var i = 0, len = optionsTypes['options'].length; i < len; i++){
          // because I don't feel like rewriting this whole method in a different way, 
          //  we can just add the unrequired choices while we're looping through the object choices,
          //  we will also add some required options for required modifiers

          var op = data.site.route.node.productOptions.edges;

          for(var e = 0, elen = op.length; e < elen; e++) {
            if(!op[e].node.isRequired) {              
              // if the current iteration of the option matches with the one we are looping
              if(optionsTypes['options'][i].name === op[e].node.displayName) {
                console.log(`${optionsTypes['options'][i].name} is not required`);
                // loop through the choices of the current iteration
                if(op[e].node.values) {
                  for(let n = 0, nlen = op[e].node.values.edges.length; n < nlen; n++) {
                    // push the possible choices to the main object
                    optionsTypes['options'][i].optionIds.push(op[e].node.values.edges[n].node.entityId);
                    optionsTypes['options'][i].choices.push(op[e].node.values.edges[n].node.label);
                  }
                }
              }
            } else {
              // Logic to handle required modifiers (non-sku)

              // if the current looping option is required, but not in the required variants array
              if(optionsTypes['options'][i].required && !requiredVariants.includes(optionsTypes['options'][i].name)) {
                if(optionsTypes['options'][i].name === op[e].node.displayName) {
                  console.log(`${optionsTypes['options'][i].name} is a required modifier`);
                  // add a variable to the current iteration so we can pass it and use it in the handlebars template
                  optionsTypes['options'][i].isModifier = true;
                }

                if(op[e].node.values) { // only if the option has multiple choices will we push the choices data
                  for(let n = 0, nlen = op[e].node.values.edges.length; n < nlen; n++) {
                    if(optionsTypes['options'][i].name === op[e].node.displayName) {
                      optionsTypes['options'][i].optionIds.push(op[e].node.values.edges[n].node.entityId);
                      optionsTypes['options'][i].choices.push(op[e].node.values.edges[n].node.label);
                    }
                  }
                }
              }
            }
          }

          // while we're here, we can remove the duplicate choices by creating a set
          optionsTypes['options'][i].optionIds = Array.from(new Set(optionsTypes['options'][i].optionIds));
          optionsTypes['options'][i].choices = Array.from(new Set(optionsTypes['options'][i].choices));
          
          //console.log(optionsTypes['options'][i].optionIds);
          //console.log(optionsTypes['options'][i].choices);
        }

        console.log(optionsTypes);

        /****** STILL NEED TO ADD HANDLING FOR PICKLIST OPTIONS AND OTHER FIELD TYPES *****/

      } else {
        console.log("No options found on product.");
        productData.variantId = data.site.route.node.variants.edges[0].node.entityId;

        if(data.site.route.node.variants.edges[0].node.sku) {
          productData.sku = data.site.route.node.variants.edges[0].node.sku;
        }
      }

      res.render("pages/product", { product: productData, optionsData: optionsTypes });
    } else {
        res.render("pages/404");
    }
  })
  .catch( err => {
      console.log(err);
  });
}

function categoryPath(req, res) {
  var path = escape(`/${req.params.path}`);
  console.log(`category by path: ${path}`);
  console.log(`cursor: ${req.query.c}`);

  let cookieAuth = req.signedCookies.user_data ? JSON.parse(req.signedCookies.user_data) : null; 
  let customerId = cookieAuth ? cookieAuth.id : null;

  dataController.getCategoryByPath(path, req.query.c, customerId)
  .then(data => {
    let categoryData = data ? data.site.route.node : null;

    if(categoryData) {
      console.log(categoryData);

      res.render("pages/category", {
        category: {
          name: categoryData.name,
          description: categoryData.description
        },
        products: categoryData.products.edges,
        page: {
          hasPrevPage: categoryData.products.pageInfo.hasPreviousPage,
          hasNextPage: categoryData.products.pageInfo.hasNextPage,
          startCursor: categoryData.products.pageInfo.startCursor,
          endCursor: categoryData.products.pageInfo.endCursor
        }
      });
    } else {
      res.render("pages/404");
    }
  })
  .catch(err => {
    console.log(err);
  });
}

function loginPage(req, res) {
  if(req.query.err == 1) {
    res.render("pages/users/login", { failure: true });
  } else if(req.query.action == "logout") {
    if(res.locals.customer) {
      res.locals.customer = null;
      
      let cookieAuth = req.signedCookies.user_data ? req.signedCookies.user_data : null;
      if(cookieAuth) {
        res.cookie("user_data", null, { maxAge: 0, signed: true });
        res.cookie("user_logout", null, { maxAge: 10000, signed: true }); // set a logout cookie
        res.redirect("/login?logout=done")
        //res.render("pages/users/login", { logout: true });
      }
    } else {
      res.redirect("/login");
    }
  } else if(req.query.logout == "done") {
    let cookieAuth = req.signedCookies.user_logout ? req.signedCookies.user_logout : null;
    if(cookieAuth) {
      res.cookie("user_logout", null, { maxAge: 0, signed: true }); // delete logout cookie
      // this prevents users from being able to type the ?logout=done query in the URL and getting this page even when not signed in
      res.render("pages/users/login", { logout: true });
    } else {
      res.redirect("/login");
    }
  } else {
    res.render("pages/users/login");
  }
}

function registerPage(req, res) {
  res.render("pages/users/register");
}

function accountPage(req, res) {
  // Make sure we're logged in before rendering the page
  if(res.locals.customer) {
    res.render("pages/users/account");
  } else {
    // otherwise, redirect to login
    res.redirect("/login");
  }
}

function cartPage(req, res) {
    // Check for authentication cookie to see if we're signed in
    let cookieAuth = req.signedCookies.user_data ? JSON.parse(req.signedCookies.user_data) : null; 
    let customerId = cookieAuth ? cookieAuth.id : null;
    
  // Make sure there's a cart already
  let cookieCart = req.cookies.bc_cart ? req.cookies.bc_cart : null;
  let cartId = cookieCart ? cookieCart : null;

  var cartContext = {}; // we will write template values to this
  var cartItems = [];

  if(cartId) {
    cartController.getCartData(cartId)
    .then(response => {
      let data = response.data;
      let { id, base_amount, discount_amount, cart_amount, line_items } = data;

      cartContext['id'] = id;
      cartContext['base_amount'] = base_amount;
      cartContext['discount_amount'] = discount_amount;
      cartContext['cart_amount'] = cart_amount;
      cartContext['tax_amount'] = -(base_amount - discount_amount - cart_amount);

      if(customerId) {
        // If we're signed in and the cart customer Id doesn't match the signed in customer
        if(data.customer_id != customerId) { 
          cartController.updateCartCustomerId(cartId, customerId)
          .then(response => {
              console.log("Updated cart customer ID");
          })
          .catch(err => {
              console.log(err);
          });
        }
      }


      // Loop through the data line items object so we can add them all to the cart context
      // Needed data: id, name, sku, quantity, url, image_url, discounts(?), discount_amount, list_price, sale_price, extended_list_price, extended_sale_price
      // Needed data from gift certs: id, name, theme, amount, quantity, sender, recipient
      let lineKeyArray = Object.keys(line_items);
      for(let a = 0, alen = lineKeyArray.length; a < alen; a++) {
        if(lineKeyArray[a] === "physical_items" ||
        lineKeyArray[a] === "digital_items" ||
        lineKeyArray[a] === "custom_items") {
          for(let b = 0, blen = line_items[`${lineKeyArray[a]}`].length; b < blen; b++) {
            console.log(line_items[`${lineKeyArray[a]}`][b]);

            let { id, product_id, name, sku, quantity, url, image_url, discount_amount, list_price, sale_price, extended_list_price, extended_sale_price } = line_items[`${lineKeyArray[a]}`][b];

            let product_path = url ? "/product" + url.match(/(\/{1}[a-zA-Z-]{1,}\/{1})/g)[0] : false;

            let pushData = { id, product_id, name, sku, quantity, product_path, image_url, discount_amount, list_price, sale_price, extended_list_price, extended_sale_price };

            if(lineKeyArray[a] === "custom_items") {
              pushData.custom_item = true;
            }

            console.log(pushData);
            cartItems.push(pushData);
          }
        } else if(Object.keys(line_items)[a] === "gift_certificates") {
          for(let b = 0, blen = line_items[`${lineKeyArray[a]}`].length; b < blen; b++) {

            let { id, name, theme, amount, quantity, sender, recipient } = line_items[`${lineKeyArray[a]}`][b];

            let pushData = { id, name, theme, amount, quantity, sender, recipient, total_cost: amount * quantity, gift_cert: true };

            cartItems.push(pushData);
          }
        }
      }

      cartContext['items'] = cartItems;
      cartContext['total_items'] = cartController.getTotalCartProducts(line_items);

      console.log(cartContext);

      res.render("pages/cart", { cart: cartContext });
    })
    .catch(err => {
      console.log(err);
    });
  } else {
    res.render("pages/cart");
  }
}

function checkoutRedirect(req, res) {
  // Check for the cart cookie to see if we have an existing cart
  let cookieCart = req.cookies.bc_cart ? req.cookies.bc_cart : null;
  let cartId = cookieCart ? cookieCart : null;

  // We don't need the customer login SSO for this, just the cart redirect URL 
  cartController.createCartRedirectURL(cartId)
  .then(response => {
    res.redirect(response.data.checkout_url);
  })
  .catch(err => {
    console.log(err);
    res.redirect("/cart");
  });
}

module.exports = {
    index,
    allProducts,
    productPath,
    categoryPath,
    loginPage,
    registerPage,
    accountPage,
    cartPage,
    checkoutRedirect
}