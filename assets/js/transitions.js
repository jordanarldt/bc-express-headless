// Script to handle JQuery styling and transitions

// sticky navbar and scrolling transitions
var stickynav = $("#stickyNav"); var stickypos = stickynav.offset().top;
var logotop = $("#bannerLogo"); var logopos = logotop.offset().top + 30;
var shopmenu = $("#navBarShop"); var shopmenutop = $("#navTopShop"); var shopmenupos = shopmenu.offset().top;

$(window).on("scroll resize",function(){
    // overlay menu sizing and movement logic
    if($("#overlayMenu").css("display") != "none") {
        $("#overlayMenu").css("height", $(window).height() - ((stickynav.offset().top + stickynav.height()) - $(window).scrollTop()));
        if(stickynav.hasClass("sticky")) {
            $("#overlayMenu").css({position: "fixed", top: stickynav.height()});
        } else {
            $("#overlayMenu").css({position: "absolute", top: "0px"});
        }
    }
    
    // store logo transition
    if($(window).scrollTop() >= logopos && $(window).scrollTop() <= logopos+logotop.height()) {
        var scrollfade = (($(window).scrollTop() - logopos)/(logotop.height()+30)).toFixed(3);
        $("#navLogo").css("visibility", "visible");
        $("#navLogo").css("opacity", scrollfade);
    } else if($(window).scrollTop() <= logopos){
        $("#navLogo").css("visibility", "hidden");
    } else {
        $("#navLogo").css("visibility", "visible");
        $("#navLogo").css("opacity", "1");
    }

    // sticky menu transition
    if($(window).scrollTop() >= stickypos + 2) {
        stickynav.addClass("sticky");
        $("body").css("padding-top", stickynav.height());
    } else {
        stickynav.removeClass("sticky");
        $("body").css("padding-top", "0");
    }

    // shop menu transition
    if(($(window).scrollTop() + stickynav.height()) >= (shopmenupos + shopmenu.height())) {
        shopmenutop.fadeIn(500).css("display", "initial");
    } else if(($(window).scrollTop() + stickynav.height()) <= shopmenupos){
        if(shopmenu.css("display") != "none" && shopmenutop.css("display") != "none") {
            shopmenutop.fadeOut(500);
        } else if(shopmenu.css("display") == "none" && shopmenutop.css("display") == "none") {
                shopmenutop.fadeIn(500);
        }
    }
});

$(document).ready(function() {

    let scrollInterval = $(".product-grid[best-selling]").width() / 2;

    $("#carousel-arrow-right[best-selling]").on("click", function() {
        $(".product-grid[best-selling]").stop();
        $(".product-grid[best-selling]").animate({
            scrollLeft: `+=${scrollInterval}`
        }, 500);
    });

    $("#carousel-arrow-left[best-selling]").on("click", function() {
        $(".product-grid[best-selling]").stop();
        $(".product-grid[best-selling]").animate({
            scrollLeft: `-=${scrollInterval}`
        }, 500);
    });
});