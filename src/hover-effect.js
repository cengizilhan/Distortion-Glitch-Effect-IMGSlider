import * as THREE from 'three';
//import TweenMax from 'gsap/TweenMax';

export default function (opts) {

  var vertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

  var fragment = `
varying vec2 vUv;

uniform float dispFactor;
uniform float dpr;
uniform sampler2D disp;

uniform sampler2D texture1;
uniform sampler2D texture2;
uniform float angle1;
uniform float angle2;
uniform float intensity1;
uniform float intensity2;
uniform vec4 res;
uniform vec2 parent;

mat2 getRotM(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec4 disp = texture2D(disp, vUv);
  vec2 dispVec = vec2(disp.r, disp.g);

  vec2 uv = 0.5 * gl_FragCoord.xy / (res.xy) ;
  vec2 myUV = (uv - vec2(0.5))*res.zw + vec2(0.5);


  vec2 distortedPosition1 = myUV + getRotM(angle1) * dispVec * intensity1 * dispFactor;
  vec2 distortedPosition2 = myUV + getRotM(angle2) * dispVec * intensity2 * (1.0 - dispFactor);
  vec4 _texture1 = texture2D(texture1, distortedPosition1);
  vec4 _texture2 = texture2D(texture2, distortedPosition2);
  gl_FragColor = mix(_texture1, _texture2, dispFactor);
}
`;

  // please respect authorship and do not remove
  console.log('%c Hover effect by Robin Delaporte: https://github.com/robin-dela/hover-effect ', 'color: #bada55; font-size: 0.8rem');


  function firstDefined() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] !== undefined) return arguments[i];
    }
  }

  var parent = opts.parent;
  var dispImage = opts.displacementImage;
  var image1 = opts.image1;
  var image2 = opts.image2;
  var imagesRatio = firstDefined(opts.imagesRatio, 1.0);
  var intensity1 = firstDefined(opts.intensity1, opts.intensity, 1);
  var intensity2 = firstDefined(opts.intensity2, opts.intensity, 1);
  var commonAngle = firstDefined(opts.angle, Math.PI / 4); // 45 degrees by default, so grayscale images work correctly
  var angle1 = firstDefined(opts.angle1, commonAngle);
  var angle2 = firstDefined(opts.angle2, -commonAngle * 3);
  var speedIn = firstDefined(opts.speedIn, opts.speed, 1.6);
  var speedOut = firstDefined(opts.speedOut, opts.speed, 1.2);
  var userHover = firstDefined(opts.hover, true);
  var easing = firstDefined(opts.easing, Expo.easeOut);
  var video = firstDefined(opts.video, false);

  if (!parent) {
    console.warn('Parent missing');
    return;
  }

  if (!(image1 && image2 && dispImage)) {
    console.warn('One or more images are missing');
    return;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(
    parent.offsetWidth / -2,
    parent.offsetWidth / 2,
    parent.offsetHeight / 2,
    parent.offsetHeight / -2,
    1,
    1000
  );

  camera.position.z = 1;

  var renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true
  });

  renderer.setPixelRatio(2.0);
  renderer.setClearColor(0xffffff, 0.0);
  renderer.setSize(parent.offsetWidth, parent.offsetHeight);
  parent.appendChild(renderer.domElement);

  var render = function () {
    // This will be called by the TextureLoader as well as TweenMax.
    renderer.render(scene, camera);
  };

  var loader = new THREE.TextureLoader();
  loader.crossOrigin = '';

  var disp = loader.load(dispImage, render);
  disp.magFilter = disp.minFilter = THREE.LinearFilter;

  if (video) {
    var animate = function() {
        requestAnimationFrame(animate);

        renderer.render(scene, camera);
    };
    animate();

    var video = document.createElement('video');
    video.autoplay = true;
    video.loop = true;
    video.src = image1;
    video.load();

    var video2 = document.createElement('video');
    video2.autoplay = true;
    video2.loop = true;
    video2.src = image2;
    video2.load();

    var texture1 = new THREE.VideoTexture(video);
    var texture2 = new THREE.VideoTexture(video2);
    texture1.magFilter = texture2.magFilter = THREE.LinearFilter;
    texture1.minFilter = texture2.minFilter = THREE.LinearFilter;

    video2.addEventListener('loadeddata', function() {
      video2.play();

      texture2 = new THREE.VideoTexture(video2);
      texture2.magFilter = THREE.LinearFilter;
      texture2.minFilter = THREE.LinearFilter;

      mat.uniforms.texture2.value = texture2;

    }, false);

    video.addEventListener('loadeddata', function() {
      video.play();

      texture1 = new THREE.VideoTexture(video);

      texture1.magFilter = THREE.LinearFilter;
      texture1.minFilter = THREE.LinearFilter;

      mat.uniforms.texture1.value = texture1;
    }, false);
  } else {
    var texture1 = loader.load(image1, render);
    var texture2 = loader.load(image2, render);
    
 
    texture1.magFilter = texture2.magFilter = THREE.LinearFilter;
    texture1.minFilter = texture2.minFilter = THREE.LinearFilter;
  }

  let a1, a2;
  var imageAspect = imagesRatio;
  if (parent.offsetHeight / parent.offsetWidth < imageAspect) {
    a1 = 1;
    a2 = parent.offsetHeight / parent.offsetWidth / imageAspect;
  } else {
    a1 = (parent.offsetWidth / parent.offsetHeight) * imageAspect;
    a2 = 1;
  }

  var mat = new THREE.ShaderMaterial({
    uniforms: {
      intensity1: {
        type: 'f',
        value: intensity1
      },
      intensity2: {
        type: 'f',
        value: intensity2
      },
      dispFactor: {
        type: 'f',
        value: 0.0
      },
      angle1: {
        type: 'f',
        value: angle1
      },
      angle2: {
        type: 'f',
        value: angle2
      },
      texture1: {
        type: 't',
        value: texture1
      },
      texture2: {
        type: 't',
        value: texture2
      },
      disp: {
        type: 't',
        value: disp
      },
      res: {
        type: 'vec4',
        value: new THREE.Vector4(parent.offsetWidth, parent.offsetHeight, a1, a2)
      },
      dpr: {
        type: 'f',
        value: window.devicePixelRatio
      }
    },

    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    opacity: 1.0,
  });

  var geometry = new THREE.PlaneBufferGeometry(parent.offsetWidth, parent.offsetHeight, 1);
  var object = new THREE.Mesh(geometry, mat);
  scene.add(object);

  function transitionIn() {
    gsap.to(mat.uniforms.dispFactor,  {
      speedIn,
      value: 1,
      ease: easing,
      onUpdate: render,
      onComplete: render,
    });
  }

  function transitionOut() {
    gsap.to(mat.uniforms.dispFactor,  {
      duration:speedOut,
      value: 0,
      ease: easing,
      onUpdate: render,
      onComplete: render,
    });
  }
  var step_num=0;

  function sliderUpdater(order){

    
    var obj2 = document.getElementById('img-holder');
    //console.log(obj2);
var imgArrParse = obj2.getAttribute('data-imgArr');
imgArrParse=JSON.parse(imgArrParse);
console.log(imgArrParse);
 
    const imgArr=imgArrParse;
    //console.log(imgArr.length);
    console.log(step_num);
  
/*
    const imgArr=['./redblack.jpg','./redblack2.jpg','./redblack3.jpg','./redblack.jpg','./redblack2.jpg','./redblack3.jpg'
,'./redblack.jpg','./redblack2.jpg','./redblack3.jpg','./redblack.jpg','./redblack2.jpg','./redblack3.jpg'];
*/
 //var orderResult=getOrder();
 orderResult=order;
/*
 if(step_num==imgArr.length+1 || step_num<0){
  console.log("out of bounds imgs");
  return;
}
*/
if(order=="decrease" && step_num==0){
  console.log("out of bounds imgs"); 
  return;
}
else if (order=="increase" && step_num==imgArr.length-1){
  console.log("out of bounds imgs");
    return;
  }


    if(orderResult=="increase"){
     
      //console.warn("teeest", step_num);
      //console.warn(orderResult);
    
    
  
      
    var loader = new THREE.TextureLoader();
    loader.crossOrigin = '';
  
    var disp = loader.load(dispImage, render);
    disp.magFilter = disp.minFilter = THREE.LinearFilter;
  
      var texture1 = loader.load(imgArr[step_num], render);
      var texture2 = loader.load(imgArr[step_num+1], render);
      texture1.magFilter = texture2.magFilter = THREE.LinearFilter;
      texture1.minFilter = texture2.minFilter = THREE.LinearFilter;
  
      let a1, a2;
      var imageAspect = imagesRatio;
      if (parent.offsetHeight / parent.offsetWidth < imageAspect) {
        a1 = 1;
        a2 = parent.offsetHeight / parent.offsetWidth / imageAspect;
      } else {
        a1 = (parent.offsetWidth / parent.offsetHeight) * imageAspect;
        a2 = 1;
      }
    
      var mat = new THREE.ShaderMaterial({
        uniforms: {
          intensity1: {
            type: 'f',
            value: intensity1
          },
          intensity2: {
            type: 'f',
            value: intensity2
          },
          dispFactor: {
            type: 'f',
            value: 0.0
          },
          angle1: {
            type: 'f',
            value: angle1
          },
          angle2: {
            type: 'f',
            value: angle2
          },
          texture1: {
            type: 't',
            value: texture1
          },
          texture2: {
            type: 't',
            value: texture2
          },
          
          disp: {
            type: 't',
            value: disp
          },
          res: {
            type: 'vec4',
            value: new THREE.Vector4(parent.offsetWidth, parent.offsetHeight, a1, a2)
          },
          dpr: {
            type: 'f',
            value: window.devicePixelRatio
          }
        },
    
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        opacity: 1.0,
      });
    
      var geometry = new THREE.PlaneBufferGeometry(parent.offsetWidth, parent.offsetHeight, 1);
      var object = new THREE.Mesh(geometry, mat);
      scene.add(object);
  
      gsap.to(mat.uniforms.dispFactor,  
        {duration:speedIn,
        value: 1,
        ease: easing,
        onUpdate: render,
        onComplete: render,
      });

      step_num++;
    }else if (orderResult=="decrease")
    {
     
      //console.warn("teeest", step_num);
      //console.warn(orderResult);
    
    
  
      
    var loader = new THREE.TextureLoader();
    loader.crossOrigin = '';
  
    var disp = loader.load(dispImage, render);
    disp.magFilter = disp.minFilter = THREE.LinearFilter;
  
      var texture1 = loader.load(imgArr[step_num], render);
      var texture2 = loader.load(imgArr[step_num-1], render);
      //console.log("text1",imgArr[step_num]);
      //console.log("text1",imgArr[step_num-1]);
      texture1.magFilter = texture2.magFilter = THREE.LinearFilter;
      texture1.minFilter = texture2.minFilter = THREE.LinearFilter;
  
      let a1, a2;
      var imageAspect = imagesRatio;
      if (parent.offsetHeight / parent.offsetWidth < imageAspect) {
        a1 = 1;
        a2 = parent.offsetHeight / parent.offsetWidth / imageAspect;
      } else {
        a1 = (parent.offsetWidth / parent.offsetHeight) * imageAspect;
        a2 = 1;
      }
    
      var mat = new THREE.ShaderMaterial({
        uniforms: {
          intensity1: {
            type: 'f',
            value: intensity1
          },
          intensity2: {
            type: 'f',
            value: intensity2
          },
          dispFactor: {
            type: 'f',
            value: 0.0
          },
          angle1: {
            type: 'f',
            value: angle1
          },
          angle2: {
            type: 'f',
            value: angle2
          },
          texture1: {
            type: 't',
            value: texture1
          },
          texture2: {
            type: 't',
            value: texture2
          },
          
          disp: {
            type: 't',
            value: disp
          },
          res: {
            type: 'vec4',
            value: new THREE.Vector4(parent.offsetWidth, parent.offsetHeight, a1, a2)
          },
          dpr: {
            type: 'f',
            value: window.devicePixelRatio
          }
        },
    
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        opacity: 1.0,
      });
    
      var geometry = new THREE.PlaneBufferGeometry(parent.offsetWidth, parent.offsetHeight, 1);
      var object = new THREE.Mesh(geometry, mat);
      scene.add(object);
  
      gsap.to(mat.uniforms.dispFactor,  {
        duration:speedOut,
        value: 1,
        ease: easing,
        onUpdate: render,
        onComplete: render,
      });

      step_num--;
    }

  

      }

  function getOrder(){
    var obj = document.getElementById('img-holder');
    //console.log(obj);
var order = obj.getAttribute('data-order');
return order;

  }

      if (userHover) {
    //parent.addEventListener('mouseenter', transitionIn);
    //parent.addEventListener('touchstart', transitionIn);
    //parent.addEventListener('mouseleave', transitionOut);
    //parent.addEventListener('touchend', transitionOut);
    //parent.addEventListener('click', sliderUpdater);
    parent.addEventListener("click", sliderUpdater.bind(this, "decrease"), false);
  }

  window.addEventListener('resize', function (e) {
    if (parent.offsetHeight / parent.offsetWidth < imageAspect) {
      a1 = 1;
      a2 = parent.offsetHeight / parent.offsetWidth / imageAspect;
    } else {
      a1 = (parent.offsetWidth / parent.offsetHeight) * imageAspect;
      a2 = 1;
    }
    object.material.uniforms.res.value = new THREE.Vector4(parent.offsetWidth, parent.offsetHeight, a1, a2);
    renderer.setSize(parent.offsetWidth, parent.offsetHeight);

    render()
  });

  /*this.next = transitionIn;
  this.previous = transitionOut;*/
  this.next=sliderUpdater.bind(this, "increase");
  this.previous=sliderUpdater.bind(this, "decrease");
  
};
