precision highp float;
varying vec3 vNormalW;
varying vec2 vUV;
varying float vFaceId;
varying vec3 vPositionW;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uLightColor;
uniform vec3 uFrontFaceColor;
uniform float uFrontAlpha;
uniform vec3 uSideWallColor;
uniform float uSideAlpha;
uniform vec3 uBackFaceColor;
uniform float uBackAlpha;
uniform vec3 uBackgroundColor;
uniform float uBackgroundAlpha;
uniform vec3 uCornerColor;
uniform float uCornerAlpha;
uniform sampler2D uDiffuseTexture;
uniform sampler2D uDiffuseBackground;
uniform float uHasTexture;
uniform float uHasBackground;
uniform vec3 uEmissiveColor;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uSpecularPower;
uniform float uAlpha;
uniform float uDisableLighting;
uniform float uTime;
uniform float uEffectIntensity;
uniform float uEffectSpeed;

void main(void) {
vec4 baseColor=vec4(1.0);
float isBg=0.0;
if(vFaceId < 0.5){
baseColor=vec4(uFrontFaceColor.rgb, uFrontAlpha);
}else if(vFaceId < 1.5) {
baseColor=vec4(uSideWallColor.rgb, uSideAlpha);
}else if(vFaceId < 2.5) {
baseColor=vec4(uBackFaceColor.rgb, uBackAlpha);
}else if(vFaceId < 3.5) {
baseColor=vec4(uBackgroundColor.rgb, uBackgroundAlpha);
isBg=1.0;
}else {
baseColor=vec4(uCornerColor.rgb, uCornerAlpha);
}

if(isBg > 0.5) {
if(uHasBackground > 0.5) baseColor *= texture2D(uDiffuseBackground, vUV);
}else {
if(uHasTexture > 0.5) baseColor *= texture2D(uDiffuseTexture, vUV);
}

vec3 finalRGB=baseColor.rgb;
if(uDisableLighting < 0.5) {
	vec3 lightDir=normalize(uLightPos - vPositionW);
	float diff=max(dot(vNormalW, lightDir), 0.0);
	vec3 ambientComponent=baseColor.rgb * uAmbientColor;
	vec3 diffuseComponent=baseColor.rgb * uDiffuseColor * diff * uLightColor;
	finalRGB=ambientComponent + diffuseComponent;
	if(isBg < 0.5) {
		vec3 viewDir=normalize(uCameraPos - vPositionW);
		vec3 reflectDir=reflect(-lightDir, vNormalW);
		float spec=pow(max(dot(viewDir, reflectDir), 0.0), uSpecularPower);
		finalRGB += uSpecularColor * spec * uLightColor;
	}
}

if(vFaceId >= 0.5 && vFaceId < 1.5){
	finalRGB += uEmissiveColor;
}

if(baseColor.a * uAlpha < 0.1) {
	discard;
}

if(vFaceId < 0.5 && uEffectIntensity > 0.01){
	float t=uTime * uEffectSpeed;
	float wave=sin(vPositionW.x * 2.0 + t) * cos(vPositionW.y * 2.0 + t);
	vec3 neon=vec3(0.0,1.0,0.8);
	finalRGB=mix(finalRGB, neon, wave * uEffectIntensity);
}

gl_FragColor=vec4(finalRGB, baseColor.a * uAlpha);
}