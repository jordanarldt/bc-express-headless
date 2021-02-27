// Controller for all customer-related actions/authentication

const fetch = require("node-fetch");
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

// Regular Storefront API token for customer validation
const GQLToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJlYXQiOjE2NDA4MjI0MDAsInN1Yl90eXBlIjoyLCJ0b2tlbl90eXBlIjoxLCJjb3JzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCJdLCJjaWQiOjEsImlhdCI6MTYwODQ0NTMzNSwic3ViIjoia2VjaThzNWZsa3B6cnV4Z2U5NXdqcng1MDVsdmFrNCIsInNpZCI6MTAwMTAwMDAyOSwiaXNzIjoiQkMifQ.IR9GY--jjOio7kOJOiF-a9IxyG5NoH_uVlZiNg1BRui99HifU0rYRF4LluthYwJ_rXXXfVC9dEFJBc1lmMvSPQ";

const GQurl = "https://store-fwqdx7x1or.mybigcommerce.com/graphql";

function authenticateSession(req, res, next) {
    let cookieAuth = req.signedCookies.user_data ? req.signedCookies.user_data : null;
    if(cookieAuth) {
        let userData = JSON.parse(cookieAuth);
        //console.log(userData);

        // Set local handlebars variables with our user data
        res.locals.customer = {
            loggedIn: true,
            customer_id: userData.id,
            customer_group_id: userData.customer_group_id,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name
        }
    } else {
        console.log("User not logged in");
    }

    // This block of headers will prevent users from seeing authentication-only information when using the back button.
    // ex. If you log out and then hit the back button, it won't look like you're still signed in
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');

    next();
}

function verifyLogin(email, pass) {
    const Gquery = `
    mutation Login($email: String!, $pass: String!) {
        login(email: $email, password: $pass) {
          result
        }
    }
    `;

    return fetch(GQurl, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GQLToken}`
        },
        body: JSON.stringify({
            query: Gquery,
            variables: {
                email: email,
                pass: pass
            }
        })
    })
    .then(data => data.json());
}

function userLogin(req, res) {
    console.log(req.body);
    let email = req.body.inputEmail;
    let pass = req.body.inputPassword;

    verifyLogin(email, pass)
    .then(data => {
        //console.log(data);

        if(data.data) { // If the GraphQL response has a success message
            console.log("Success, retrieve customer data from BC and store in a cookie");

            // Retrieve logged in customer data from BigCommerce API,
            // if BC gives us a success response, we shouldn't have any issues getting the data
            bigC.apiVersion = "v3";
            bigC.get(`/customers?email:in=${email}`)
            .then(response => {
                let { id, customer_group_id, email, first_name, last_name } = response.data[0];
                let customerData = { id, customer_group_id, email, first_name, last_name };
                //let expiryTime = (60 * 60 * 24 * 1000 * 7); // 7 days
                res.cookie("user_data", JSON.stringify(customerData), { maxAge: cookieMaxAge, signed: true });

                res.redirect("/account");                
            })
            .catch(err => {
                console.log(err);
            });

        } else if(data.errors) { // If the login fails
            console.log("Failure");
            res.redirect("/login?err=1");
        }
    })
    .catch(err => {
        console.log(err);
    });
}

function userRegister(req, res) {

}

module.exports = {
    userLogin,
    userRegister,
    authenticateSession
}