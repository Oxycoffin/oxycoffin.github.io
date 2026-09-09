/* Bruma renderer v2. World coordinates are 1280 x 720, y down.
   Albedo and normal textures share UVs. Light vectors use world positions,
   never sprite-local UVs. Mirroring also mirrors the normal's x component. */
export const W = 1280, H = 720;
const VERT = `
attribute vec2 aUV;
uniform vec4 uRect;
uniform float uFlip,uPhase,uWalk,uCat;
varying vec2 vUV,vWorld;
void main(){
 vec2 q=aUV;
 if(uCat>.5){
  float feet=smoothstep(.68,.97,q.y);
  float leg=sin(uPhase+((q.x<.52)?0.:3.141593));
  q.x+=uWalk*feet*leg*.031;
  q.y-=uWalk*feet*max(0.,cos(uPhase+((q.x<.52)?0.:3.141593)))*.025;
  float tail=(1.-smoothstep(.22,.36,q.x))*(1.-smoothstep(.5,.65,q.y));
  q.x+=tail*sin(uPhase*.36)*.009;
 }
 if(uFlip<0.)q.x=1.-q.x;
 vec2 world=uRect.xy+q*uRect.zw;
 vWorld=world;vUV=aUV;
 gl_Position=vec4(world.x/640.-1.,1.-world.y/360.,0.,1.);
}`;
const FRAG = `
precision highp float;
uniform sampler2D uColor,uNormal;
uniform vec3 uLP[4],uLC[4];
uniform float uRadius[4],uFlip,uOpacity,uKind,uNormals,uSpec,uExposure,uGain;
uniform vec3 uAmbient;
varying vec2 vUV,vWorld;
void main(){
 vec4 c=texture2D(uColor,vUV);
 if(c.a<.008)discard;
 if(uKind>.5){gl_FragColor=vec4(.012,.015,.027,c.a*uOpacity);return;}
 vec3 n=normalize(texture2D(uNormal,vUV).rgb*2.-1.);
 n.x*=uFlip;
 if(uNormals>.5){gl_FragColor=vec4(n*.5+.5,c.a);return;}
 vec3 illumination=uAmbient;
 vec3 shine=vec3(0.);
 for(int i=0;i<4;i++){
  vec3 delta=uLP[i]-vec3(vWorld,0.);
  float d=length(delta);
  vec3 L=delta/max(d,.001);
  float att=pow(max(0.,1.-d/uRadius[i]),2.);
  float diffuse=max(dot(n,L),0.);
  illumination+=uLC[i]*att*diffuse;
  vec3 halfDirection=normalize(L+vec3(0.,0.,1.));
  float wet=mix(uSpec,min(.35,uSpec+.16),smoothstep(570.,690.,vWorld.y));
  shine+=uLC[i]*att*pow(max(dot(n,halfDirection),0.),40.)*wet;
 }
 vec3 linear=pow(max(c.rgb,vec3(.0001)),vec3(2.2));
 vec3 lit=linear*illumination*uExposure*uGain+shine*.045;
 lit=lit/(vec3(1.)+lit*.28);
 gl_FragColor=vec4(pow(max(lit,vec3(0.)),vec3(1./2.2)),c.a*uOpacity);
}`;
const POSTV=`attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(aUV*2.-1.,0.,1.);}`;
const POSTF=`precision mediump float;uniform sampler2D uFrame;uniform vec2 uPixel;uniform float uPlain;varying vec2 vUV;
void main(){vec3 c=texture2D(uFrame,vUV).rgb;vec3 bloom=vec3(0.);
for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){vec3 s=texture2D(uFrame,vUV+vec2(float(x),float(y))*uPixel*3.).rgb;bloom+=max(s-vec3(.62),vec3(0.));}}
float vignette=1.-.18*pow(length((vUV-.5)*vec2(1.18,1.)),2.);
gl_FragColor=vec4(mix((c+bloom*.034)*vignette,c,uPlain),1.);}`;
export class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!this.gl)throw Error('WebGL no está disponible / WebGL is unavailable.');
  const gl=this.gl;this.images={};this.assets={};this.normalView=false;
  this.prog=this.program(VERT,FRAG);this.post=this.program(POSTV,POSTF);
  this.uniforms={};for(const key of ['uRect','uFlip','uPhase','uWalk','uCat','uColor','uNormal','uLP[0]','uLC[0]','uRadius[0]','uOpacity','uKind','uNormals','uSpec','uExposure','uGain','uAmbient'])this.uniforms[key]=gl.getUniformLocation(this.prog,key);
  const uv=[],indices=[];const nx=32,ny=28;
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)uv.push(x/nx,y/ny);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x;indices.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}
  this.verts=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.verts);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
  this.indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);this.count=indices.length;
  this.postVerts=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.postVerts);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
  this.fbo=gl.createFramebuffer();this.frameTex=gl.createTexture();this.fbW=0;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;document.dispatchEvent(new CustomEvent('bruma-render-error'));});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
 }
 program(v,f){const gl=this.gl,p=gl.createProgram();for(const [type,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
 texture(image){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return t;}
 async load(names,progress){let done=0;await Promise.all(names.map(async name=>{const imgs=await Promise.all(['.webp','.normal.png'].map(ext=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('No se pudo cargar / Could not load '+name+ext));im.src='assets/'+name+ext;})));this.images[name]=imgs[0];this.assets[name]=imgs.map(im=>this.texture(im));progress?.(++done/names.length);}));}
 add(name,color,normal){this.assets[name]=[this.texture(color),this.texture(normal)];this.images[name]=color;}
 begin(lights,ambient,exposure=1.5){
  if(this.lost)return;const g=this.gl,c=this.canvas;const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5,1280/Math.max(1,r.width));const w=Math.max(2,Math.round(r.width*d)),h=Math.max(2,Math.round(r.height*d));
  if(this.fbW!==w||this.fbH!==h){this.fbW=w;this.fbH=h;c.width=w;c.height=h;g.bindTexture(g.TEXTURE_2D,this.frameTex);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.frameTex,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Framebuffer incomplete');}
  g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);g.viewport(0,0,w,h);g.clearColor(.025,.03,.055,1);g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.prog);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
  g.bindBuffer(g.ARRAY_BUFFER,this.verts);const a=g.getAttribLocation(this.prog,'aUV');g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,this.indices);
  const U=this.uniforms;g.uniform3fv(U['uLP[0]'],new Float32Array(lights.flatMap(l=>l.p)));g.uniform3fv(U['uLC[0]'],new Float32Array(lights.flatMap(l=>l.c)));g.uniform1fv(U['uRadius[0]'],new Float32Array(lights.map(l=>l.r)));g.uniform3fv(U.uAmbient,ambient);g.uniform1f(U.uExposure,exposure);g.uniform1f(U.uNormals,this.normalView?1:0);
 }
 draw(name,rect,options={}){if(this.lost)return;const g=this.gl,t=this.assets[name];if(!t)return;const U=this.uniforms;g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,t[0]);g.uniform1i(U.uColor,0);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,t[1]);g.uniform1i(U.uNormal,1);g.uniform4fv(U.uRect,rect);g.uniform1f(U.uFlip,options.flip||1);g.uniform1f(U.uPhase,options.phase||0);g.uniform1f(U.uWalk,options.walk||0);g.uniform1f(U.uCat,options.cat?1:0);g.uniform1f(U.uOpacity,options.opacity??1);g.uniform1f(U.uKind,options.shadow?1:0);g.uniform1f(U.uSpec,options.spec??.08);g.uniform1f(U.uGain,options.gain??1);g.drawElements(g.TRIANGLES,this.count,g.UNSIGNED_SHORT,0);}
 end(){if(this.lost)return;const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,null);g.disable(g.BLEND);g.useProgram(this.post);g.bindBuffer(g.ARRAY_BUFFER,this.postVerts);const a=g.getAttribLocation(this.post,'aUV');g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.frameTex);g.uniform1i(g.getUniformLocation(this.post,'uFrame'),0);g.uniform2f(g.getUniformLocation(this.post,'uPixel'),1/this.canvas.width,1/this.canvas.height);g.uniform1f(g.getUniformLocation(this.post,'uPlain'),this.normalView?1:0);g.drawArrays(g.TRIANGLE_STRIP,0,4);}
}
// Derive a tangent-space normal texture from an actual height field.
// This is an approximate relief, not a reconstructed 3D scene.
export function heightNormal(canvas,strength=9){const c=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height,a=c.getImageData(0,0,w,h).data,out=document.createElement('canvas');out.width=w;out.height=h;const ctx=out.getContext('2d'),n=ctx.createImageData(w,h);const at=(x,y)=>a[(Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x)))*4]/255;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(at(x+1,y)-at(x-1,y))*strength,dy=(at(x,y+1)-at(x,y-1))*strength,d=Math.hypot(dx,dy,1),i=(y*w+x)*4;n.data[i]=(-dx/d*.5+.5)*255;n.data[i+1]=(-dy/d*.5+.5)*255;n.data[i+2]=(1/d*.5+.5)*255;n.data[i+3]=255;}ctx.putImageData(n,0,0);return out;}
