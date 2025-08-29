import Box from "./Box";
import "../styles/MainContent.css";
import profileImg from "../assets/profile.png";
import contourGif from "../assets/contours.mp4"
import fourierSketch from "../sketches/fourier";
import { initNNPath } from "../sketches/initNNPath";
import P5Wrapper from "./P5Wrapper";
import podgeSketch from "../sketches/automata";
import { useMemo, useState } from "react";


export default function MainContent() {
  useMemo(() => {
    initNNPath();
  }, []);

  const [drawMode, setDrawMode] = useState(false);

  // Button handler: toggles drawmode in React and p5 sketch
  const handleToggleDrawMode = () => {
    setDrawMode(dm => !dm);
    if (window.flipFourier) window.flipFourier();
  };

  return (
    <div className="main-content">
      <h1>Software Developer / Student</h1>

      <div className="comic-layout">
        <div className="row">
          <Box className="panel small panel-profile">
            <img src={profileImg} alt="Albert Yang" className="profile-img" />
          </Box>
          <Box className="panel medium">
            <h1>about me:</h1>
            <h2>
              hi, I'm Albert Yang. Computer Science student at the University
              of Waterloo. Check out what I've worked on!
            </h2>
            <h2></h2>
            <h2>me</h2>
            <h2>&lt;--------------------</h2>
          </Box>
          <Box className="panel medium">
            <h1>contact me:</h1>
            <h2>email: albert.yang727@gmail.com</h2>
            <h2>github: 
              <a
                href="https://github.com/Albear-Yang?tab=followers"
                target="_blank"
                rel="noopener noreferrer"
              >
                 albear-yang
              </a>
            </h2>
            <h2>linkedin: 
              <a
                href="https://www.linkedin.com/in/albert-yang-128776241/"
                target="_blank"
                rel="noopener noreferrer"
              >
                 Albert Yang
              </a>
            </h2>
          </Box>
        </div>
        <div className="row">
          <Box className="panel full">
          <h2>
            projects that look pretty
          </h2>
          </Box>
        </div>
        <div className="row">
          <Box className="panel medium">
            <video
              src={contourGif}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </Box>
          <Box className="panel small">
            <h2>
              eikonal contours
            </h2>
          </Box>
          <Box className="panel medium">
            <P5Wrapper sketch={fourierSketch} />
          </Box>
          <Box className="panel small">
            <h2>
              fourier transform
            </h2>
            <button
              onClick={handleToggleDrawMode}
              style={{
                marginBottom: "1rem",
                padding: "0.5rem 1rem",
                fontSize: "1rem",
                borderRadius: "6px",
                border: "none",
                background: drawMode ? "#ffd700" : "#eee",
                color: "#222",
                cursor: "pointer",
              }}
            >
              {drawMode ? "Exit Draw Mode" : "Enter Draw Mode"}
            </button>
          </Box>
        </div>
        <div className="row">
          <Box className="panel full">
            <h2>
            cellular automata Belousov Zhabotinsky reaction
          </h2>
          </Box>
          <Box className="panel large">
            <P5Wrapper sketch={podgeSketch} />
          </Box>
          <Box className="panel full">
            <h2>
            graphing my face w/ desmos and python
          </h2>
          </Box>
          <Box className="panel large">
          <iframe
            title="Desmos calculator - Epicycles"
            src="https://www.desmos.com/calculator/uetowhl0ov?embed"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: "1px solid #ccc" }}
            allowFullScreen
          />
        </Box>
        </div>
        <div className="row">
            <Box className="panel full">
              <h2>
                resume
              </h2>
            </Box>
        </div>
      </div>
    </div>
  );
}
