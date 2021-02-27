*****
- Headless BigCommerce Store with Node.js Express Handlebars
-   created by 
- ~ Jordan Arldt
*****

This is intended to be used as a detailed example of how a headless integration with BigCommerce should work with Node.js Express. I mainly created this just to practice full stack development and learn more about creating a headless integration with the BigCommerce platform. This also provides some insight on how the BigCommerce Stencil platform actually works with handlebars context and templates.

This app is intended to be fully functional aside from some missing pages that would be added if it was a real store.
If you want to use this headless integration as a base with your own BigCommerce store, you will need to follow the setup and then customize it to your liking.

LIVE EXAMPLE: 

----------------------
---- INSTRUCTIONS ----
----------------------

1. You will need to place your store's customer impersonation storefront API token into the GQLToken variable in all of the files where it is used. Also update the "GQurl" variable to your store's GraphQL API endpoint. 
    - /controllers/storedata.js
    - /controllers/auth.js

2. Enter your store's API credentials in the following files
    - /controllers/auth.js
    - /controllers/cart.js
    - /controllers/storedata.js

3. Edit the context.json file to easily modify certain aspects of the site content. I created this file to make it easier to change certain values without needing to search through the code.

4. Set your cookie max age (default 7 days) to your preference in the following files:
    - /controllers/auth.js - for login life
    - /controllers/cart.js - for cart life



----------------------
----     NOTES    ----
----------------------

1. BigCommerce GraphQL functionality does not work for the "isDefault" product option selection currently. This prevents options from being selected by default on product pages. A workaround would be to use the API instead, but this would require re-writing some of the logic for rendering product pages.

2. Cart functionality DOES support Gift Certificates and Custom Items in carts. Gift certificates cannot be modified due to API limitations.

----------------------
----  NEED TO ADD ----
----------------------

1. Functionality for modifier option rules to affect product pages.

2. Add different option styles instead of just radio buttons (Swatch, Radio, Text Box, Rectangle, Dropdown, Pick List, etc.), as well as the logic to render and handle these properly.

3. Add discount pricing strike-outs on product and cart pages

4. Multiple product images on product pages

5. Support for multiple currencies (app only currently supports USD)

*** 6. Create a custom checkout instead of a redirected checkout

[DONE] 7. Add blog post feed to the homepage

8. Add blog page

9. Add the "SHOP" menu overlay, as well as the "MENU" overlay.

10. Account signup functionality
