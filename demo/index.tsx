import * as React from 'react'
import { Reconciler } from 'react-nylon'

interface HostConfig {
  type: string
  props: Record<string, any>
  container: HTMLElement
  instance: HTMLElement
  textInstance: Text
  suspenseInstance: never
  hydratableInstance: never
  publicInstance: HTMLElement
  hostContext: null
  updatePayload: void
  childSet: never
  timeoutHandle: number
  noTimeout: -1
}

function applyProps<T extends HostConfig['instance']>(
  instance: T,
  oldProps: HostConfig['props'],
  newProps: HostConfig['props'],
): T {
  for (const key in { ...oldProps, ...newProps }) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    if (Object.is(oldValue, newValue) || key === 'children') continue

    if (key === 'style') {
      for (const k in { ...oldValue, ...newValue } as CSSStyleDeclaration) {
        if (oldValue?.[k] !== newValue?.[k]) {
          instance.style[k] = newValue?.[k] ?? ''
        }
      }
    } else if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase()
      if (oldValue) instance.removeEventListener(event, oldValue)
      instance.addEventListener(event, newValue)
    } else if (newValue == null) {
      instance.removeAttribute(key)
    } else {
      instance.setAttribute(key, newValue)
    }
  }

  return instance
}

const reconciler = Reconciler<
  HostConfig['type'],
  HostConfig['props'],
  HostConfig['container'],
  HostConfig['instance'],
  HostConfig['textInstance'],
  HostConfig['suspenseInstance'],
  HostConfig['hydratableInstance'],
  HostConfig['publicInstance'],
  HostConfig['hostContext'],
  HostConfig['updatePayload'],
  HostConfig['childSet'],
  HostConfig['timeoutHandle'],
  HostConfig['noTimeout']
>({
  createInstance(type, props) {
    return applyProps(document.createElement(type), {}, props)
  },
  createTextInstance(text) {
    return document.createTextNode(text)
  },
  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.textContent = newText
  },
  getPublicInstance(instance) {
    return instance
  },
  // appendInitialChild(parent, child) {
  //   parent.appendChild(child)
  // },
  appendChild(parent, child) {
    parent.appendChild(child)
  },
  appendChildToContainer(container, child) {
    container.appendChild(child)
  },
  insertBefore(parent, child, beforeChild) {
    parent.insertBefore(child, beforeChild)
  },
  insertInContainerBefore(container, child, beforeChild) {
    container.insertBefore(child, beforeChild)
  },
  removeChild(parent, child) {
    parent.removeChild(child)
  },
  removeChildFromContainer(container, child) {
    container.removeChild(child)
  },
  prepareUpdate(instance, type, oldProps, newProps, rootContainer, hostContext) {},
  commitUpdate(instance, updatePayload, type, prevProps, nextProps, internalHandle) {
    applyProps(instance, prevProps, nextProps)
  },
  finalizeInitialChildren(instance, type, props, rootContainer, hostContext) {
    return false
  },
  commitMount(instance, type, props, internalHandle) {},
  preparePortalMount(containerInfo) {},
  // Unimplemented
  // shouldSetTextContent(type, props) {
  //   return true
  // },
  // getRootHostContext(rootContainer) {
  //   return null
  // },
  // getChildHostContext(parentHostContext, type, rootContainer) {
  //   return null
  // },
  // prepareForCommit(containerInfo) {
  //   return null
  // },
  // resetAfterCommit(containerInfo) {},
  // resetTextContent(instance) {},
  // hideInstance(instance) {},
  // hideTextInstance(textInstance) {},
  // unhideInstance(instance, props) {},
  // unhideTextInstance(textInstance, text) {},
  // clearContainer(container) {},
})

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)

  React.useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl2')!

    const vertex = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(
      vertex,
      /* glsl */ `#version 300 es
        void main() {
          vec2 position[] = vec2[](vec2(-1), vec2(3, -1), vec2(-1, 3));
          gl_Position = vec4(position[gl_VertexID], 0, 1);
        }
      `,
    )
    gl.compileShader(vertex)

    const fragment = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(
      fragment,
      /* glsl */ `#version 300 es
        precision lowp float;
        uniform vec3 mouse;
        uniform vec2 resolution;
        uniform float time;
        out vec4 color;

        const int MAX_STEPS = 100;
        const float MAX_DIST = 999.0;
        const float EPSILON = 1e-6;

        const float PI = 3.14159265359;
        const float PHI = 1.61803398875;

        // https://shadertoy.com/view/4djSRW
        float hash1(float p) {
          p = fract(p * 0.1031);
          p *= p + 33.33;
          p *= p + p;
          return fract(p);
        }
        float hash2(vec2 p) {
          vec3 p3 = fract(p.xyx * 0.2831);
          p3 += dot(p3, p3.yzx + 19.19);
          return fract((p3.x + p3.y) * p3.z);
        }
        float hash3(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        mat2 rotate(float a) {
          return mat2(cos(a), sin(a), -sin(a), cos(a));
        }

        struct Ray {
          vec3 position;
          vec3 direction;
        };

        Ray camera(vec2 uv, float fov, vec3 position) {
          position.yz *= rotate(0.6 * (mouse.y / resolution.y - 0.5));
          position.zx *= rotate(1.2 * (mouse.x / resolution.x - 0.5));

          // Orientation
          // vec3 ww = normalize(-position);
          // vec3 uu = normalize(cross(ww, vec3(0, 1, 0)));
          // vec3 vv = normalize(cross(uu, ww));
          // mat3 orientation = mat3(-uu, vv, -ww);

          // Perspective
          float f = 1.0 / tan((fov * 0.5) * (PI / 180.0));

          // TODO: cleaner derivation
          // https://shadertoyunofficial.wordpress.com/2019/01/02/programming-tricks-in-shadertoy-glsl
          uv = uv * 2.0 - 1.0;
          uv.x *= resolution.x / resolution.y;

          return Ray(position, normalize(vec3(uv, f)));
        }

        float[] shipGeometry = float[](
          0.447956,0.263649,-1.740639,-0.447956,-0.592643,0.064408,-0.895913,0.0,0.0,0.0,-0.1104,-0.9939,1.0,0.215861,0.215861,0.0,0.664045,-0.303772,0.0,-0.593793,1.570167,0.3,-0.394036,-0.456986,0.8729,0.4561,0.173,0.047274,0.296477,0.8,-0.3,0.27001,-0.760758,0.3,0.394035,0.456986,0.3,0.212329,-0.514815,-0.7093,0.6935,-0.1261,0.047274,0.296477,0.8,0.0,0.664045,-0.303772,0.3,-0.394036,-0.456986,0.0,-0.181706,-0.971801,0.7093,0.6935,-0.1261,0.047274,0.296477,0.8,0.0,0.664045,-0.303772,-0.3,-0.394035,-0.456986,0.0,-0.593793,1.570167,-0.8729,0.4561,0.173,0.047274,0.296477,0.8,0.0,-0.3,3.168733,0.0,1.098304,-5.092798,-1.0,0.0,-4.168733,-0.6619,0.7328,0.1576,0.49499,0.618285,0.8,1.0,-0.3,-1.0,-2.0,0.0,0.0,-1.0,1.098304,-0.924065,0.0,-0.6456,-0.7637,0.49499,0.618285,0.8,-1.0,-0.3,-1.0,2.0,0.0,0.0,1.0,0.0,4.168733,0.0,-1.0,0.0,0.49499,0.618285,0.8,0.772652,-0.3,-0.743818,0.378231,0.0,-0.246623,0.719115,1.488035,-0.493364,0.5455,0.0157,0.838,0.49499,0.618285,0.8,-0.772652,-0.3,-0.743818,-0.719115,1.488036,-0.493364,-0.378231,0.0,-0.246623,-0.5455,0.0158,0.838,0.49499,0.618285,0.8,-1.086163,-0.43934,-1.346018,-0.06472,0.13934,0.355577,-0.405604,1.627376,0.108836,-0.9679,-0.2361,-0.0865,0.49499,0.618285,0.8,1.086163,-0.43934,-1.346019,0.405604,1.627375,0.108837,0.06472,0.13934,0.355578,0.9679,-0.2361,-0.0865,0.49499,0.618285,0.8,1.491767,1.188035,-1.237182,-0.405604,-1.627375,-0.108837,-0.719115,-1.488035,0.493364,-0.8369,0.2448,-0.4895,0.49499,0.618285,0.8,1.150883,-0.3,-0.990441,-0.378231,0.0,0.246623,-0.06472,-0.13934,-0.355578,0.2128,-0.9221,0.3231,0.49499,0.618285,0.8,-1.150883,-0.3,-0.990441,0.06472,-0.13934,-0.355577,0.378231,0.0,0.246623,-0.2128,-0.9221,0.3231,0.49499,0.618285,0.8,-1.491767,1.188036,-1.237182,0.719115,-1.488036,0.493364,0.405604,-1.627376,-0.108836,0.8369,0.2448,-0.4895,0.49499,0.618285,0.8,0.530632,-0.288396,-0.582366,0.0,0.139211,-0.166579,2.703453,-0.527187,0.0,-0.1496,-0.7557,-0.6376,0.49499,0.618285,0.8,0.530632,-0.149185,-0.748945,0.0,-0.085085,1.271236,2.703453,-0.666398,0.166578,0.2365,0.9696,0.0631,0.49499,0.618285,0.8,0.530632,-0.288396,-0.582366,2.703453,-0.527187,0.0,0.0,0.054126,1.104657,-0.1883,-0.981,0.0471,0.49499,0.618285,0.8,-0.530632,-0.234269,0.522291,0.0,0.085084,-1.271236,-2.703453,-0.581312,-1.104657,-0.2365,0.9696,0.0631,0.49499,0.618285,0.8,-0.530632,-0.288396,-0.582366,0.0,0.054127,1.104657,-2.703453,-0.527185,0.0,0.1883,-0.981,0.0471,0.49499,0.618285,0.8,-0.530632,-0.149185,-0.748945,0.0,-0.139211,0.166579,-2.703453,-0.666396,0.166579,0.1496,-0.7557,-0.6376,0.49499,0.618285,0.8,0.0,-0.3,3.168733,1.0,0.0,-4.168733,0.0,1.098304,-5.092798,0.6619,0.7328,0.1576,0.49499,0.618285,0.8,0.0,-0.328994,-1.676231,-0.279947,0.514515,0.360777,-0.447957,0.592643,-0.064408,-0.7905,-0.577,0.2055,0.49499,0.618285,0.8,0.0,-0.328994,-1.676231,0.0,0.156257,0.59657,-0.279947,0.514515,0.360777,-0.8237,-0.5491,0.1412,0.49499,0.618285,0.8,0.279947,0.185521,-1.315454,-0.279947,-0.514515,-0.360777,0.168009,0.078128,-0.425185,0.7904,-0.5771,0.2055,0.49499,0.618285,0.8,0.279947,0.185521,-1.315454,-0.279947,-0.358258,0.235793,-0.279947,-0.514515,-0.360777,0.8237,-0.5491,0.1412,0.49499,0.618285,0.8,-0.279947,0.185521,-1.315454,0.727903,0.078128,-0.425185,-0.16801,0.078128,-0.425185,0.0,0.9835,0.1807,0.49499,0.618285,0.8,-0.279947,0.185521,-1.315454,0.559894,0.0,0.0,0.727903,0.078128,-0.425185,0.0,0.9835,0.1807,0.49499,0.618285,0.8
        );

        struct Hit {
          bool hit;
          vec2 uv;
          vec3 normal;
          vec3 color;
          float dist;
        };

        // https://iquilezles.org/articles/distfunctions
        float plane(vec3 p, vec3 n, float h) {
          return dot(p, n) + h;
        }

        float rock(vec3 p, float N) {
          float d;

          for (float i = 0.0; i <= N; i++) {
            float y = 1.0 - i * (2.0 / N);
            float r = sqrt(1.0 - y * y);

            float theta = PHI * i;
            float x = sin(theta) * r;
            float z = -cos(theta) * r;

            vec3 n = normalize(vec3(x, y, z));
            d = max(d, plane(p, n, -1.0));
          }

          return d;
        }

        float scene(vec3 p) {
          float d = MAX_DIST;

          p.z -= 20.0;

          float count = 30.0;
          float scale = 30.0;
          float offset = 15.0;
          float N = 12.0;

          for (float i = 0.0; i < count * 3.0; i += 3.0) {
            d = min(d, rock(p - vec3(hash1(i), hash1(i + 2.0), hash1(i + 1.0)) * scale + offset, N));
          }

          // d = min(d, rock(p - vec3(0, -2, 5), 12.0));
          // d = min(d, rock(p - vec3(0, 0, 5), 12.0));
          // d = min(d, rock(p - vec3(0, 2, 5), 12.0));

          return d;
        }
        vec3 getNormal(vec3 p) {
          float d = scene(p);
          vec2 e = vec2(0.01, 0);
          vec3 n = vec3(scene(p - e.xyy), scene(p - e.yxy), scene(p - e.yyx));
          return normalize(d - n);
        }

        // https://shadertoy.com/view/lllXz4
        vec2 inverseSF(vec3 p, float n) {
          float m = 1.0 - 1.0 / n;

          float phi = min(atan(p.y, p.x), PI), cosTheta = p.z;

          float k = max(2.0, floor(log(n * PI * sqrt(5.0) * (1.0 - cosTheta * cosTheta)) / log(PHI + 1.0)));
          float Fk = pow(PHI, k) / sqrt(5.0);
          vec2 F = vec2(round(Fk), round(Fk * PHI)); // k, k + 1

          vec2 ka = 2.0 * F / n;
          vec2 kb = 2.0 * PI * (fract((F + 1.0) * PHI) - (PHI - 1.0));

          mat2 iB = mat2(ka.y, -ka.x, kb.y, -kb.x) / (ka.y * kb.x - ka.x * kb.y);

          vec2 c = floor(iB * vec2(phi, cosTheta - m));
          float d = 8.0;
          float j = 0.0;
          for (int s = 0; s < 4; s++) {
            vec2 uv = vec2(float(s - 2 * (s / 2)), float(s / 2));

            float i = dot(F, uv + c); // all quantities are integers (can take a round() for extra safety)

            float phi = 2.0 * PI * fract(i * PHI);
            float cosTheta = m - 2.0 * i / n;
            float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

            vec3 q = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
            float squaredDistance = dot(q - p, q - p);
            if (squaredDistance < d) {
              d = squaredDistance;
              j = i;
            }
          }
          return vec2(j, sqrt(d));
        }

        float noise(in vec3 x) {
          vec3 p = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);

          return mix(mix(mix(hash3(p + vec3(0, 0, 0)),
                             hash3(p + vec3(1, 0, 0)), f.x),
                         mix(hash3(p + vec3(0, 1, 0)),
                             hash3(p + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(hash3(p + vec3(0, 0, 1)),
                             hash3(p + vec3(1, 0, 1)), f.x),
                         mix(hash3(p + vec3(0, 1, 1)),
                             hash3(p + vec3(1, 1, 1)), f.x), f.y), f.z);
        }
        float FBM(vec3 p) {
          float fbm = 0.0;

          // Domain warping
          vec3 warp = vec3(
            noise(p * 0.8 + vec3(13, 44, 15)),
            noise(p * 0.8 + vec3(43, 74, 25)),
            noise(p * 0.8 + vec3(33, 14, 75))
          );

          warp -= 0.5;

          p += vec3(123, 234, 55);
          p += warp * 0.6;

          fbm = noise(p) * 1.0 +
                noise(p * 2.02) * 0.49 +
                noise(p * 7.11) * 0.24 +
                noise(p * 13.05) * 0.12 +
                noise(p * 27.05) * 0.055 +
                noise(p * 55.25) * 0.0025+
                noise(p * 96.25) * 0.00125;

          return fbm;
        }

        // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve
        void ACESFilm(inout vec3 x) {
          float a = 2.51;
          float b = 0.03;
          float c = 2.43;
          float d = 0.59;
          float e = 0.14;
          x = (x * (a * x + b)) / (x * (c * x + d) + e);
        }

        void main() {
          // Camera
          vec2 uv = gl_FragCoord.xy / resolution;
          Ray ray = camera(uv, 75.0, vec3(0, 1.2, -5));

          // Slight blue shift
          color = vec4(0, 0, 0.05, 1);

          // Film grain
          // color += 0.06 * hash2(uv * vec2(1462.439, 297.185));

          // Ship
          Hit ship = Hit(false, vec2(0), ray.direction, vec3(1), 1e24);
          for (int i = 0; i < shipGeometry.length();) {
            vec3 A = vec3(shipGeometry[i++], shipGeometry[i++], shipGeometry[i++]);
            vec3 AB = vec3(shipGeometry[i++], shipGeometry[i++], shipGeometry[i++]);
            vec3 AC = vec3(shipGeometry[i++], shipGeometry[i++], shipGeometry[i++]);
            vec3 normal = vec3(shipGeometry[i++], shipGeometry[i++], shipGeometry[i++]);
            vec3 color = vec3(shipGeometry[i++], shipGeometry[i++], shipGeometry[i++]);

            // A.yz *= rotate(-0.6 * (mouse.y / resolution.y - 0.5));
            // A.zx *= rotate(-1.2 * (mouse.x / resolution.x - 0.5));
            // AB.yz *= rotate(-0.6 * (mouse.y / resolution.y - 0.5));
            // AB.zx *= rotate(-1.2 * (mouse.x / resolution.x - 0.5));
            // AC.yz *= rotate(-0.6 * (mouse.y / resolution.y - 0.5));
            // AC.zx *= rotate(-1.2 * (mouse.x / resolution.x - 0.5));

            // Avoid divide by zero
            vec3 pvec = cross(ray.direction, AC);
            float det = dot(AB, pvec);
            if (det < EPSILON) continue;

            // UV x + y test
            vec2 uv;

            vec3 tvec = ray.position - A;
            uv.x = dot(tvec, pvec);
            if (uv.x < 0.0 || uv.x > det) continue;

            vec3 qvec = cross(tvec, AB);
            uv.y = dot(ray.direction, qvec);
            if (uv.y < 0.0 || uv.y + uv.x > det) continue;

            // Distance test
            det = 1.0 / det;
            float dist = dot(AC, qvec) * det;
            if (dist < 0.0 || dist > ship.dist || dist >= ship.dist) continue;

            ship.hit = true;
            ship.uv = uv * det;
            ship.normal = normal;
            ship.color = color;
            ship.dist = dist;
          }

          // Raymarch scene
          float d, dt;
          for (int i = 0; i < MAX_STEPS; i++) {
            d = scene(ray.position + ray.direction * dt);
            dt += d;
            if (d < EPSILON || dt > MAX_DIST) break;
          }

          vec3 lightPos = vec3(-1, 1, 0.5);

          if (dt < MAX_DIST && dt < ship.dist) {
            vec3 normal = getNormal(ray.position + ray.direction * dt);
            color.rgb += clamp(dot(normalize(lightPos), normal), 0.0, 1.0) * 0.5 + 0.5;

            // float edge = length(dFdx(normal)) + length(dFdy(normal));
            // color.rgb += (1.0 - clamp(edge * 10.0, 0.0, 1.0));
          } else if (ship.hit) {
            float lighting = clamp(dot(normalize(lightPos), ship.normal), 0.0, 1.0) * 0.5 + 0.5;
            color.rgb += ship.color * lighting;

            // float edge = length(dFdx(ship.normal)) + length(dFdy(ship.normal));
            // color.rgb += ship.color * (1.0 - clamp(edge * 10.0, 0.0, 1.0));
          } else {
            // Forward far plane
            vec3 skybox = normalize(ray.position + ray.direction * 1000.0);

            // Stars
            for (float i = 0.0; i < 5.0; i++) {
              vec2 sphere = inverseSF(skybox, 50000.0 + i * 5000.0);
              float random = hash1((sphere.x + i * 10.0) * 0.015);
              color += smoothstep(0.00025 + 0.0015 * pow((1.0 - random), 15.0), 0.0002, sphere.y) * smoothstep(0.1, 0.0, random);
            }

            // Nebulae
            float noise = FBM(skybox * 2.0 + vec3(0, 0, time * 0.05));
            float nebulae = smoothstep(0.4, 1.8, noise);
            color.rgb += max(0.3 - abs(nebulae - 0.3), 0.0) * vec3(0.0, 0.2, 0.7) +
                         max(0.2 - abs(nebulae - 0.4), 0.0) * vec3(0.5, 0.4, 0.3) +
                         max(0.3 - abs(nebulae - 0.5), 0.0) * vec3(0.1, 0.2, 0.4);
          }

          // Tonemapping
          ACESFilm(color.rgb);
        }
      `,
    )
    gl.compileShader(fragment)

    const program = gl.createProgram()!
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)

    if (process.env.NODE_ENV === 'development') {
      for (const shader of [vertex, fragment]) {
        const error = gl.getShaderInfoLog(shader)
        if (error) {
          let line = 0
          throw `${error}\n${gl.getShaderSource(shader)!.replace(/^/gm, () => `${++line}:`)}`
        }
      }
      const error = gl.getProgramInfoLog(program)
      if (error) throw `${gl.getProgramInfoLog(program)}`
    }

    gl.useProgram(program)

    onpointermove = (e) => {
      gl.uniform3f(gl.getUniformLocation(program, 'mouse'), e.clientX, e.clientY, e.buttons)
    }

    const animate = (time: DOMHighResTimeStamp) => {
      requestAnimationFrame(animate)
      gl.viewport(0, 0, (canvas.width = innerWidth), (canvas.height = innerHeight))
      gl.uniform2f(gl.getUniformLocation(program, 'resolution'), innerWidth, innerHeight)
      gl.uniform1f(gl.getUniformLocation(program, 'time'), time / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    requestAnimationFrame(animate)
  }, [])

  return <canvas ref={canvasRef} />
}

// document.getElementById('root')
declare global {
  const root: HTMLCanvasElement
}

const container = reconciler.createContainer(root, 1, null, false, null, '', console.error, null)
reconciler.updateContainer(<App />, container, null, undefined)
