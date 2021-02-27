// separate script to declare all of our Javascript-based modals/overlays

var modals = {
    alert_oos: `<div class="alert alert-danger popup" id="alert-oos"><span></span>The selected combination is out of stock.</div>`,
    alert_add_cart_success: `<div class="alert alert-success cart popup" id="cart-add-popup"><span></span>Product has been added to your cart.</div>`,
    loading: `<div class="loading-overlay"><span></span></div>`
};

function createDeleteItemModal(cartId, itemId) {
    $("body").append(`
    <div class="overlay-prompt" data-cart-id="${cartId}" data-item-id="${itemId}">
        <div class="overlay-prompt-container">
            <div class="overlay-prompt-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" style="fill: rgb(225, 80, 90);"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1.31 7.526c-.099-.807.528-1.526 1.348-1.526.771 0 1.377.676 1.28 1.451l-.757 6.053c-.035.283-.276.496-.561.496s-.526-.213-.562-.496l-.748-5.978zm1.31 10.724c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>
            </div>
            <div class="overlay-prompt-content">
                <p>Are you sure you want to remove this item?</p>
            </div>
            <div class="overlay-prompt-actions">
                <button id="cart-remove-confirm" class="btn btn-lg btn-primary shadow-none simple" onclick="deleteItemModalConfirm(this)">Confirm</button>
                <button id="cart-remove-cancel" class="btn btn-lg btn-primary shadow-none simple" onclick="removeDeleteItemModal()">Cancel</button>
            </div>
        </div>
    </div>`);

    $(".overlay-prompt").animate({
        opacity: 1
    }, 250);
}

function deleteItemModalConfirm(caller) {
    let cartId = $(caller).parents(".overlay-prompt[data-cart-id]").attr("data-cart-id");
    let itemId = $(caller).parents(".overlay-prompt[data-item-id]").attr("data-item-id");

    ajaxCartItemUpdate(cartId, itemId, null, 0);
    removeDeleteItemModal(true);
}

function removeDeleteItemModal(blend) {
    if(blend == true) {
        $(".overlay-prompt[data-cart-id]").css("background","none")
    }

    if($(".overlay-prompt[data-cart-id]").length) {
        $(".overlay-prompt[data-cart-id]").animate({
            opacity: 0
        }, 100, function() { $(".overlay-prompt[data-cart-id]").remove(); });
    }
}

function createGenericOverlayWarning(message) {
    $("body").append(`
    <div class="overlay-prompt">
        <div class="overlay-prompt-container">
            <div class="overlay-prompt-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" style="fill: rgb(225, 80, 90);"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1.31 7.526c-.099-.807.528-1.526 1.348-1.526.771 0 1.377.676 1.28 1.451l-.757 6.053c-.035.283-.276.496-.561.496s-.526-.213-.562-.496l-.748-5.978zm1.31 10.724c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>
            </div>
            <div class="overlay-prompt-content">
                <p>${message}</p>
            </div>
            <div class="overlay-prompt-actions">
                <button id="overlay-generic-continue" class="btn btn-lg btn-primary shadow-none simple" onclick="removeGenericOverlayWarning()">Ok</button>
            </div>
        </div>
    </div>`);

    $(".overlay-prompt").animate({
        opacity: 1
    }, 250);
}

function removeGenericOverlayWarning() {
    if($(".overlay-prompt").length) {
        $(".overlay-prompt").animate({
            opacity: 0
        }, 200, function() { $(".overlay-prompt").remove(); });
    }
}