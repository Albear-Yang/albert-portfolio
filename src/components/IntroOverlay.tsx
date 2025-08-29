// components/IntroOverlay.tsx
interface Props {
  onClick: () => void;
  isShrinking?: boolean;
}

export default function IntroOverlay({ onClick, isShrinking }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed',
        zIndex: 10,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#111',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isShrinking ? 'default' : 'pointer',
        userSelect: 'none',
        borderRadius: isShrinking ? '2rem' : 0,
        transition: 'all 0.8s cubic-bezier(.77,0,.18,1)',
        transform: 'none',
        boxShadow: isShrinking ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
        margin: 0,
        padding: 0,
      }}
    >
      <h1 style={{ fontSize: '2rem' }}>Click to Enter</h1>
    </div>
  );
}
