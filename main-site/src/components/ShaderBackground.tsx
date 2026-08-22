// @ts-nocheck
import { useEffect, useRef } from 'react';

export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    // Vertex shader
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment shader (Dimensional Frost Refined Shader)
    const fsSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      float grid(vec2 uv, float res) {
          vec2 grid = fract(uv * res);
          return 1.0 - smoothstep(0.0, 0.04, min(grid.x, grid.y));
      }

      vec2 rotate(vec2 v, float a) {
          float s = sin(a);
          float c = cos(a);
          return mat2(c, -s, s, c) * v;
      }

      void main() {
          vec2 uv = v_texCoord;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;
          
          // 3D Perspective Distortion for Floor
          float perspective = 1.0 / (abs(p.y) + 1.2);
          vec2 gridUV = p * perspective;
          gridUV.y += u_time * 0.12;
          gridUV = rotate(gridUV, u_time * 0.03);
          
          // Grid layers
          float g1 = grid(gridUV, 8.0);
          float g2 = grid(gridUV * 2.0, 8.0);
          float g = mix(g1, g2, 0.5) * perspective;
          
          // Floating "Lidar" Particles (Pseudo-3D)
          float particles = 0.0;
          for(float i=1.0; i<6.0; i++) {
              vec2 pPos = sin(vec2(u_time * 0.15 * i, u_time * 0.22 * i)) * 0.8;
              float d = length(p - pPos);
              particles += smoothstep(0.02 * i, 0.0, d) * (0.4 / i);
          }
          
          // Colors
          vec3 bg = vec3(0.06, 0.08, 0.09); // Matches #101415 approx
          vec3 gold = vec3(0.83, 0.69, 0.22); // #d4af37
          vec3 violet = vec3(0.54, 0.36, 0.96); // #8b5cf6
          vec3 orange = vec3(0.91, 0.55, 0.16); // #e88c2a (Brand orange)
          
          // Interaction
          vec2 mouse = u_mouse / u_resolution;
          float dist = length(uv - mouse);
          float spot = smoothstep(0.5, 0.0, dist);
          
          // Combine
          vec3 color = bg;
          
          // Light orange for moving lines
          vec3 lightOrange = vec3(1.0, 0.7, 0.3);
          vec3 gridColor = mix(orange, lightOrange, sin(u_time * 0.5 + gridUV.x * 2.0) * 0.5 + 0.5);
          color = mix(color, gridColor, g * 0.7); // Increased from 0.25 to 0.7 for better visibility
          
          // Particles glow with a mix of gold and brand orange
          vec3 particleGlow = mix(gold, orange, sin(u_time * 0.8) * 0.5 + 0.5);
          color += particleGlow * particles * 0.6;
          
          // Mouse spotlight brings out the warm orange tones dynamically
          color += orange * g * spot * 0.4;
          
          // Pulsing "Data Stream" with flowing orange and gold energy
          float pulse = smoothstep(0.95, 1.0, sin(gridUV.y * 12.0 - u_time * 3.5));
          vec3 streamColor = mix(gold, orange, cos(gridUV.y * 5.0 - u_time * 2.0) * 0.5 + 0.5);
          color += streamColor * pulse * perspective * 0.5;

          gl_FragColor = vec4(color, 1.0);
      }
    `;

    function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return;
    gl.attachShader(shaderProgram, vs);
    gl.attachShader(shaderProgram, fs);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return;
    }

    gl.useProgram(shaderProgram);

    // Vertex positions
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionAttribute = gl.getAttribLocation(shaderProgram, 'a_position');
    gl.enableVertexAttribArray(positionAttribute);
    gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(shaderProgram, 'u_time');
    const uRes = gl.getUniformLocation(shaderProgram, 'u_resolution');
    const uMouse = gl.getUniformLocation(shaderProgram, 'u_mouse');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = window.innerHeight - e.clientY; // Flip y for WebGL
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Handle resizing
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = (time: number) => {
      if (!document.hidden) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(shaderProgram);

        if (uTime) gl.uniform1f(uTime, time * 0.001);
        if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
        if (uMouse) gl.uniform2f(uMouse, mouseX, mouseY);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      id="shader-canvas"
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-80"
      style={{ display: 'block', backgroundColor: '#101415' }}
    />
  );
}
