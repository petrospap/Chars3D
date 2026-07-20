precision highp float;
attribute vec3 position;
attribute vec3 normal; 
attribute vec2 uv;
attribute float aFaceId;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormalW;
varying vec2 vUV;
varying float vFaceId;
varying vec3 vPositionW;
void main(void){
vFaceId=aFaceId;
vUV=uv;
vPositionW=vec3(modelViewMatrix*vec4(position,1.0));
vec3 localNormal=vec3(0.0);
if(aFaceId<0.5){
localNormal=normalize(vec3(normal.x*0.2,normal.y*0.2,-1.0));
}else if(aFaceId<1.5){
localNormal=normalize(vec3(normal.x,normal.y,-0.4));
}else if(aFaceId<2.5){
localNormal=vec3(0.0,0.0,1.0);  
}else{
localNormal=vec3(0.0,0.0,-1.0); 
}
vNormalW=normalize(normalMatrix*localNormal);
gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
