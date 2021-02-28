const express = require("express");
const path = require("path");
//const fs = require("fs");
//const hbs = require("handlebars");
const exphbs = require("express-handlebars");
const cookieParser = require("cookie-parser");
const forceHTTPS = require("express-force-https");

const app = express();

// Controllers
const mainController = require("./controllers/main");
const dataController = require("./controllers/storedata");
const userController = require("./controllers/auth");
const cartController = require("./controllers/cart");

const api = require("./api/post");

// All strings in the context.json file will be passed to the handlebars templates
const context = require("./context.json");

// Turned this into middleware to fetch the data on every page load
function storeData(req, res, next) {
    if(req.path != "/favicon.ico") { // prevent double request from favicon

        let cookieAuth = req.signedCookies.user_data ? JSON.parse(req.signedCookies.user_data) : null; 
        let customerId = cookieAuth ? cookieAuth.id : null;

        dataController.getStoreData(customerId)
        .then(results => {
            console.log("Retrieved store data");
            var results = results;
            var addressFormatted = results.site.settings.contact.address.replace(/\n/g,"<br>");

            dataController.getBlogPosts(3)
            .then(data => {
                let blogPosts = [];
                // we only push blog data if the post is published
                for(let i = 0, len = data.length; i < len; i++) {
                    if(data[i].is_published) {
                        blogPosts.push(data[i]);
                    }
                }
                //console.log(blogPosts);

                app.locals.blogData = blogPosts;

                app.locals.storeData = {
                    storeName: results.site.settings.storeName,
                    storeHash: results.site.settings.storeHash,
                    storeLogo: results.site.settings.logo,
                    channelId: results.site.settings.channelId,
                    categories: results.site.categoryTree,
                    contact: results.site.settings.contact,
                    address: addressFormatted,
                    bestSellingProducts: results.site.bestSellingProducts.edges
                };

                // pass context strings to application
                app.locals.context = context;

                next();
            })
            .catch(err => {
                console.log("Error getting store blog data");
                console.log(err);

                app.locals.blogData = null;

                app.locals.storeData = {
                    storeName: results.site.settings.storeName,
                    storeHash: results.site.settings.storeHash,
                    storeLogo: results.site.settings.logo,
                    channelId: results.site.settings.channelId,
                    categories: results.site.categoryTree,
                    contact: results.site.settings.contact,
                    address: addressFormatted,
                    bestSellingProducts: results.site.bestSellingProducts.edges
                };

                // pass context strings to application
                app.locals.context = context;

                next();
            });
        })
        .catch(err => {
            console.log("Error getting store data");
            console.log(err);
        });   
    }
}


// Handlebars setup
// Create some helpers and we'll pass them into the handlebars object

function currencyHelper(value) { // Display currencies and add commas
    var a = parseFloat(value).toFixed(2);
    var b = a.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `$${b}`;
}

function eqStr(arg1, arg2) {
    if(arg1 === arg2) {
        return true;
    } else {
        return false;
    }
}

function ifCond(arg1, arg2, arg3) {
    if(arg2 === ">") {
        if(arg1 > arg3) {
            return true;
        } else {
            return false;
        }
    } else if(arg2 === "<") {
        if(arg1 < arg3) {
            return true;
        } else {
            return false;
        }        
    } else if(arg2 == "=") {
        if(arg1 == arg3) {
            return true;
        } else {
            return false;
        }        
    } else if(arg2 === ">=") {
        if(arg1 >= arg3) {
            return true;
        } else {
            return false;
        }        
    } else if(arg2 === "<=") {
        if(arg1 <= arg3) {
            return true;
        } else {
            return false;
        }        
    }
}

function ifOr2(arg1, arg2) {
    if(arg1 != "" || arg2 != "") {
        return true;
    } else {
        return false;
    }
}

function truncateString(str, len) {
    //console.log(str);
    if(str.length > len && str.length > 0) {
        var new_str = str + " ";
        new_str = str.substr (0, len);
        new_str = str.substr (0, new_str.lastIndexOf(" "));
        new_str = (new_str.length > 0) ? new_str : str.substr (0, len);

        return new_str +'...';         
    }
}

function dateText(str) {
    let d = new Date(str);

    return d.toDateString();
}

var handlebars = exphbs.create({
    partialsDir: "./templates/components",
    layoutsDir: "./templates/layout",
    defaultLayout: "base",
    extname: ".hbs",
    helpers: {
        currency: currencyHelper,
        eqStr: eqStr,
        ifCond: ifCond,
        ifOr2: ifOr2,
        trunc: truncateString,
        date: dateText
    }
});

app.engine("hbs", handlebars.engine);
app.set("views", "templates");
app.set("view engine", "hbs");

// Middleware
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(forceHTTPS);
app.use(cookieParser("headless-signature"));
app.use(api); // Middleware to handle all internal API posts
app.use(userController.authenticateSession); // Middleware for user/customer authentication
app.use(storeData); // Refresh store data on every page load
app.use(cartController.updateCartCounter); // Check cart content count on every page load

// Routes
app.get("/", mainController.index);
app.get("/shop", mainController.allProducts);
app.get("/product/:path(*)", mainController.productPath);
app.get("/category/:path(*)", mainController.categoryPath);
app.get("/login", mainController.loginPage);
app.get("/register", mainController.registerPage);
app.get("/account", mainController.accountPage);
app.get("/cart", mainController.cartPage);
app.get("/checkout", mainController.checkoutRedirect);

app.get("/*", (req, res) => { res.render("pages/404"); })

// Error handling
app.use(function(err, req, res, next) {
    console.log(err);
    res.status(500);
    res.send("Oops, something went wrong.");
});

var listener = app.listen(process.env.PORT || 8080, function () {
    console.log("Listening on port " + listener.address().port);
  });  