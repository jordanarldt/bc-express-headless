// This file handles all the GraphQL requests we'll make to BC (aside from authorization requests)

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

//const GQLToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJlYXQiOjE2NDA4MjI0MDAsInN1Yl90eXBlIjoyLCJ0b2tlbl90eXBlIjoxLCJjb3JzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCJdLCJjaWQiOjEsImlhdCI6MTYwODQ0NTMzNSwic3ViIjoia2VjaThzNWZsa3B6cnV4Z2U5NXdqcng1MDVsdmFrNCIsInNpZCI6MTAwMTAwMDAyOSwiaXNzIjoiQkMifQ.IR9GY--jjOio7kOJOiF-a9IxyG5NoH_uVlZiNg1BRui99HifU0rYRF4LluthYwJ_rXXXfVC9dEFJBc1lmMvSPQ";

// Customer impersonation token
const GQLToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJlYXQiOjE2NDA4MjI0MDAsInN1Yl90eXBlIjoyLCJ0b2tlbl90eXBlIjoyLCJjb3JzIjpbXSwiY2lkIjoxLCJpYXQiOjE2MTIxNjMzMTksInN1YiI6ImtlY2k4czVmbGtwenJ1eGdlOTV3anJ4NTA1bHZhazQiLCJzaWQiOjEwMDEwMDAwMjksImlzcyI6IkJDIn0.qBQD-JCcGWuOYyEf8AHCp2ojKwDafyH6KcLwH5SMX3d5lHMHLbpYNGlrHuZCvHrbPUIrpaMhpAbeHreA7qL_vw";

const GQurl = "https://store-fwqdx7x1or.mybigcommerce.com/graphql";

const productsPerPage = 50;

function getStoreData(customer_id) {
  var Gquery = `
  # Fetch details about a product by its ID
  query storeData {
    site {
      bestSellingProducts {
        edges {
          node {
            entityId
            name
            sku
            path
            defaultImage {
              url(width: 320)
            }
            prices {
              price {
                ...MoneyFields
              }
              priceRange {
                min {
                  ...MoneyFields
                }
                max {
                  ...MoneyFields
                }
              }
            }
          }
        }
      }
      settings {
        storeName
        storeHash
        logo {
          title
        }
        contact {
          address
          country
          phone
          email
        }
        channelId
      }
      categoryTree {
        ...categoryData
        children {
          ...categoryData
        }
      }
    }
  }   
  
  fragment categoryData on CategoryTreeItem {
    name
    path
    entityId
    children {
      name
      path
      entityId
    }
  }   

  fragment MoneyFields on Money {
    value
    currencyCode
  }
  `;

  if(customer_id) {
    var headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GQLToken}`,
      "X-Bc-Customer-Id": customer_id
    }
  } else {
    var headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GQLToken}`
    }
  }

  return fetch(GQurl, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: headers,
      body: JSON.stringify({ query: Gquery})
  })
  .then(res => res.json())
  .then(res => res.data);
}

function getAllProductsPaginate(customer_id) {
  const Gquery = `
    query paginateProducts(
      $pageSize: Int = 25
    ) {
      site {
        products (first: $pageSize) {
          pageInfo {
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              entityId 
              name
              path
              prices {
                price {
                  ...MoneyFields
                }
                priceRange {
                  min {
                    ...MoneyFields
                  }
                  max {
                    ...MoneyFields
                  }
                }
              }
              defaultImage {
                url(width: 320)
              }
            }
          }
        }
      }
    }
    
    fragment MoneyFields on Money {
      value
      currencyCode
    }`;

    if(customer_id) {
      var headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GQLToken}`,
        "X-Bc-Customer-Id": customer_id
      }
    } else {
      var headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GQLToken}`
      }
    }

  return fetch(GQurl, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: headers,
      body: JSON.stringify({ query: Gquery})
  })
  .then(res => res.json())
  .then(res => res.data);
}

function getProductByPath(path, customer_id) {
  const Gquery = `
  query productByPath {
    site {
      route(path: "${path}") {
        node {
      		... on Product {
            id
            entityId
            name
            sku
            path
            plainTextDescription
            width {
              value
            }
            height {
              value
            }
            depth {
              value
            }
            weight {
              value
            }
            customFields {
              edges {
                node {
                  entityId
                  name
                  value
                }
              }
            }
            defaultImage {
              ...ImageFields
            }
            images {
              edges {
                node {
                  ...ImageFields
                }
              }
            }
            reviewSummary {
              summationOfRatings
              numberOfReviews
            }
            prices {
              price {
                ...MoneyFields
              }
              priceRange {
                min {
                  ...MoneyFields
                }
                max {
                  ...MoneyFields
                }
              }
              salePrice {
                ...MoneyFields
              }
              retailPrice {
                ...MoneyFields
              }
              saved {
                ...MoneyFields
              }
              bulkPricing {
                minimumQuantity
                maximumQuantity
                ... on BulkPricingFixedPriceDiscount {
                  price
                }
                ... on BulkPricingPercentageDiscount {
                  percentOff
                }
                ... on BulkPricingRelativePriceDiscount {
                  priceAdjustment
                }
              }
            }
            brand {
              name
            }
            variants {
              edges {
                node {
                  entityId
                  sku
                  prices {
                    price {
                      value
                    }
                  }
                  inventory {
                    isInStock
                    aggregated {
                      availableToSell
                    }
                  }
                  options {
                    edges {
                      node {
                        entityId
                        displayName
                        isRequired
                        values {
                          edges {
                            node {
                              entityId
                              label
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            productOptions {
              edges {
                node {
                  ...ProductOptions
                }
              }
            }
      		}
        }
    	}
    }
  }
  
  fragment ProductOptions on CatalogProductOption {
    entityId
    displayName
    isRequired
    __typename
    ... on MultipleChoiceOption {
      values {
        edges {
          node {
            entityId
            __typename
            label
            ... on ProductPickListOptionValue {
              entityId
              productId
              label
            }
          }
        }
      }
    }
    ... on CheckboxOption {
      entityId
      displayName
      isRequired
      checkedByDefault
    }
  }
  
  fragment ImageFields on Image {
    url320wide: url(width: 320)
    url640wide: url(width: 640)
    url960wide: url(width: 960)
    url1280wide: url(width: 1280)
  }
  
  fragment MoneyFields on Money {
    value
    currencyCode
  }
  `;

  if(customer_id) {
    var headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GQLToken}`,
      "X-Bc-Customer-Id": customer_id
    }
  } else {
    var headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GQLToken}`
    }
  }

  return fetch(GQurl, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: headers,
      body: JSON.stringify({ query: Gquery})
  })
  .then(res => res.json())
  .then(res => res.data);
}

// create some sort of pagination system maybe
function getCategoryByPath(path, cursor, customer_id) {
  const Gquery = `
  query CategoryByUrl(
    $count: Int!
    $cursor: String!
  ) {
    site {
      route(path: "${path}") {
        node {
          id
          ... on Category {
            name
            entityId
            description
            products (first: $count, after: $cursor) {
              pageInfo {
                startCursor
                endCursor
                hasNextPage
                hasPreviousPage
              }
              edges {
                cursor
                node {
                  id
                  entityId
                  name
                  sku
                  path
                  plainTextDescription
                  defaultImage {
                    url(width: 320)
                  }
                  images {
                    edges {
                      node {
                        ...ImageFields
                      }
                    }
                  }
                  reviewSummary {
                    summationOfRatings
                    numberOfReviews
                  }
                  prices {
                    price {
                      ...MoneyFields
                    }
                    priceRange {
                      min {
                        ...MoneyFields
                      }
                      max {
                        ...MoneyFields
                      }
                    }
                    salePrice {
                      ...MoneyFields
                    }
                    retailPrice {
                      ...MoneyFields
                    }
                    saved {
                      ...MoneyFields
                    }
                    bulkPricing {
                      minimumQuantity
                      maximumQuantity
                      ... on BulkPricingFixedPriceDiscount {
                        price
                      }
                      ... on BulkPricingPercentageDiscount {
                        percentOff
                      }
                      ... on BulkPricingRelativePriceDiscount {
                        priceAdjustment
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  fragment ImageFields on Image {
    url320wide: url(width: 320)
    url640wide: url(width: 640)
    url960wide: url(width: 960)
    url1280wide: url(width: 1280)
  }
  
  fragment MoneyFields on Money {
    value
    currencyCode
  }`;

  if(customer_id) {
    var headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GQLToken}`,
      "X-Bc-Customer-Id": customer_id
    }
  } else {
    var headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GQLToken}`
    }
  }

  return fetch(GQurl, {
    method: "POST",
    credentials: "include",
    mode: "cors",
    headers: headers,
    body: JSON.stringify({
      query: Gquery,
      variables: {
        count: productsPerPage,
        cursor: cursor ? cursor : ""
      }
    })
  })
  .then(res => res.json())
  .then(res => res.data);
}

function findSkuByChoices(productId, optionValueIds, customer_id) {
  var Gquery = `
  query findSkuByChoices (
    $productId: Int!
    $optionValueIds: [OptionValueId!]
    ) {
    site {
      product(
        entityId: $productId
        optionValueIds: $optionValueIds
      ) {
        name 
        sku
        prices {
          price {
            value
          }
        }
        inventory {
          isInStock
          aggregated {
            availableToSell
          }
        }
      }
    }
  }`;

  if(customer_id) {
    var headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GQLToken}`,
      "X-Bc-Customer-Id": customer_id
    }
  } else {
    var headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GQLToken}`
    }
  }
  
  return fetch(GQurl, {
    method: "POST",
    credentials: "include",
    mode: "cors",
    headers: headers,
    body: JSON.stringify({
      query: Gquery, 
      variables: {
        productId: productId,
        optionValueIds: optionValueIds
      }
    })
  }).then(res => res.json() )
  .then(res => res.data);
}

function getDataFromAttributes(req, res) {
  // Load the SKUs and Variants into variables for easy access
  let skus = req.app.locals.skus;
  let variantIds = req.app.locals.variantIds;
  let attributesArray = [];

  // use a loop to prep the attributes for the graphQL query
  for(let i = 0, len = req.body.attributes.length; i < len; i++) {
    attributesArray[i] = {
      optionEntityId: parseInt(req.body.attributes[i][`parent`]),
      valueEntityId: parseInt(req.body.attributes[i][`choice`])
    }
  }

  //console.log("Finding SKU by selection");

  let cookieAuth = req.signedCookies.user_data ? JSON.parse(req.signedCookies.user_data) : null; 
  let customerId = cookieAuth ? cookieAuth.id : null;

  // Make the request
  findSkuByChoices(parseInt(req.body.product_id), attributesArray, customerId)
  .then(data => {
    for(let i = 0, len = skus.length; i < len; i++) {
      if(data.site.product.sku === skus[i]) {
        var variantId = variantIds[i];
      }
    }

    // Respond with the data we're looking for
    res.json({
      sku: data.site.product.sku,
      id: variantId,
      price: data.site.product.prices.price.value,
      instock: data.site.product.inventory.isInStock
    });
  })
  .catch(err => {
    res.json("Error fetching SKU");
    console.log(err);
  });
}

function findVariantInventoryBySku(sku) {
  var Gquery = `
  query VariantBySku (
    $variantSku: String!
  ) {
    site {
      product(sku: $variantSku) {
        name
        sku
        inventory {
          aggregated {
            availableToSell
          }
        }
      }
    }
  }`;

  var headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${GQLToken}`
  }
  
  return fetch(GQurl, {
    method: "POST",
    credentials: "include",
    mode: "cors",
    headers: headers,
    body: JSON.stringify({
      query: Gquery, 
      variables: {
        variantSku: sku
      }
    })
  }).then(res => res.json())
  .then(res => res.data);
}

function findProductInventoryById(id) {
  var Gquery = `
  query productById(
    $productId: Int! 
  ) {
    site {
      product(entityId: $productId) {
        entityId
        name
        sku
        inventory {
          aggregated {
            availableToSell
          }
        }
      }
    }
  }`;

  var headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${GQLToken}`
  }
  
  return fetch(GQurl, {
    method: "POST",
    credentials: "include",
    mode: "cors",
    headers: headers,
    body: JSON.stringify({
      query: Gquery, 
      variables: {
        productId: parseInt(id)
      }
    })
  }).then(res => res.json())
  .then(res => res.data);
}

function getBlogPosts(limit) {
  var uri;
  if(limit) {
    uri = `/blog/posts?limit=${limit}`;
  } else {
    uri = "/blog/posts";
  }

  bigC.apiVersion = "v2";
  return bigC.get(uri);
}

module.exports = {
    getStoreData,
    getDataFromAttributes,
    getAllProductsPaginate,
    getCategoryByPath,
    getProductByPath,
    findVariantInventoryBySku,
    findProductInventoryById,
    getBlogPosts
}
