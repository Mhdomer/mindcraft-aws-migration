import React, { useState } from 'react';

export default function Torch({ className = "w-20 h-20" }) {
    const [isOn, setIsOn] = useState(true);

    return (
        <div
            className={`${className} relative cursor-pointer group`}
            onClick={() => setIsOn(!isOn)}
            title={isOn ? "Click to extinguish" : "Click to light"}
        >
            <svg
                viewBox="0 0 16 32"
                xmlns="http://www.w3.org/2000/svg"
                shapeRendering="crispEdges"
                className={`w-full h-full drop-shadow-lg transition-all duration-300 ${!isOn ? 'opacity-80 grayscale-[0.8]' : ''}`}
            >
                {/* Torch Handle (Wood) */}
                <rect x="6" y="16" width="4" height="12" fill="#6D4C41" />
                <rect x="6" y="16" width="1" height="12" fill="#5D4037" /> {/* Shading */}
                <rect x="9" y="16" width="1" height="12" fill="#8D6E63" /> {/* Highlight */}

                {/* Torch Head (Coal/Charcoal) - Darker when off */}
                <rect x="5" y="12" width="6" height="4" fill={isOn ? "#3E2723" : "#1a100e"} />
                <rect x="5" y="12" width="1" height="4" fill="#1B1B1B" /> {/* Shading */}

                {/* Fire Frame 1 (Main) */}
                {isOn && (
                    <g>
                        <animate attributeName="opacity" values="1;0;1" dur="0.2s" calcMode="discrete" repeatCount="indefinite" />
                        {/* Core */}
                        <rect x="6" y="8" width="4" height="4" fill="#FFEB3B" />
                        {/* Inner */}
                        <rect x="7" y="9" width="2" height="2" fill="#FFF" />
                        {/* Outer Orange */}
                        <rect x="5" y="9" width="1" height="3" fill="#FF9800" />
                        <rect x="10" y="9" width="1" height="3" fill="#FF9800" />
                        <rect x="6" y="7" width="4" height="1" fill="#FF9800" />
                        {/* Top Red tips */}
                        <rect x="6" y="5" width="1" height="2" fill="#F44336" />
                        <rect x="9" y="4" width="1" height="3" fill="#F44336" />
                        <rect x="8" y="6" width="1" height="1" fill="#F44336" />
                    </g>
                )}

                {/* Fire Frame 2 (Flicker state) */}
                {isOn && (
                    <g opacity="0">
                        <animate attributeName="opacity" values="0;1;0" dur="0.2s" calcMode="discrete" repeatCount="indefinite" />
                        {/* Core */}
                        <rect x="6" y="8" width="4" height="4" fill="#FFEB3B" />
                        {/* Inner */}
                        <rect x="7" y="9" width="2" height="2" fill="#FFF" />
                        {/* Outer Orange shifted */}
                        <rect x="5" y="8" width="1" height="4" fill="#FF9800" />
                        <rect x="10" y="10" width="1" height="2" fill="#FF9800" />
                        <rect x="6" y="7" width="4" height="1" fill="#FF9800" />
                        {/* Top Red tips changed */}
                        <rect x="7" y="4" width="1" height="3" fill="#F44336" />
                        <rect x="6" y="6" width="1" height="1" fill="#F44336" />
                        <rect x="9" y="6" width="1" height="1" fill="#F44336" />
                    </g>
                )}

                {/* Smoke particles when off (Optional simple detail) */}
                {!isOn && (
                    <g>
                        <rect x="7" y="8" width="1" height="1" fill="#555" opacity="0.6">
                            <animate attributeName="y" values="8;4" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
                        </rect>
                        <rect x="8" y="9" width="1" height="1" fill="#777" opacity="0.4">
                            <animate attributeName="y" values="9;5" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.4;0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                        </rect>
                    </g>
                )}

                {/* Glow Halo (Subtle) */}
                {isOn && (
                    <circle cx="8" cy="8" r="6" fill="rgba(255, 152, 0, 0.2)">
                        <animate attributeName="r" values="6;7;6" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.2;0.3;0.2" dur="0.1s" repeatCount="indefinite" />
                    </circle>
                )}
            </svg>
        </div>
    );
}
