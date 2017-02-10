"use strict";
let orel;
window.onload = function () {
    Orel.ajax({
        url: 'config.json',
        success: function (config) {
            orel = new Orel(config, 'wrapper', 1);
        }
    });
};
