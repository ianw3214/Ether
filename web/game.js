"use strict";

export default class GameInstance {
    constructor(engineInstance) {
        this.renderObj = engineInstance.createRenderObject(0, 0);
        this.renderObj2 = engineInstance.createRenderObject(100, 0);
    }

    update(deltaSeconds) {
        
    }

    render(engineInstance) {
        engineInstance.render(this.renderObj);
        engineInstance.render(this.renderObj2);
    }
}