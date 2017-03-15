"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Config {
}
exports.Config = Config;
function inject(constructor) {
    return constructor.bind({
        config: new Config()
    });
}
exports.inject = inject;
