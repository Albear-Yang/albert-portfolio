import { useEffect, useRef } from "react";
import p5 from "p5";

type Sketch = (p: p5) => void;

export default function P5Wrapper({ sketch }: { sketch: Sketch }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let instance: p5 | undefined;

    if (containerRef.current) {
      instance = new p5(sketch, containerRef.current);
    }

    return () => {
      instance?.remove(); // cleanup
    };
  }, [sketch]);

  return <div ref={containerRef} className="w-full h-full" style={{ height: "100%" }} />;
}
