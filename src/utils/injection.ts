class Config {

}

function inject(constructor: Function) {
    return constructor.bind({
        config: new Config()
    });
}

export { Config, inject };