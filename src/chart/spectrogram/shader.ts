/** 定点着色器--依据Y轴高度，进行色谱取值 */
const vertexShader = /*glsl*/ `
    uniform mat4 projectionMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 modelMatrix;
    uniform float colorImages[2000];
    uniform float top;
    uniform float bottom;

    attribute vec3 position;

    varying lowp vec4 varyColor;
    
    void main(){
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0);
        
        int colorCount = int(smoothstep(bottom,top,position.y)*(top-bottom));
        int colorIndex = colorCount * 4;
        varyColor = vec4(colorImages[colorIndex]/255.0,colorImages[colorIndex+1]/255.0,colorImages[colorIndex+2]/255.0,1.0);
    }
`
/** 片着色器，根据定点进行相近取色 */
const fragmentShader = /*glsl*/ `
    precision mediump float;
    varying lowp vec4 varyColor;

    void main(){
        gl_FragColor = varyColor;
    }
`
export { vertexShader, fragmentShader }
