export function CommanderPortrait({ src, name }: { src: string; name: string }) {
  if (src.startsWith("http")) {
    return (
      <img
        src={src}
        alt={name}
        className="h-28 w-28 object-contain drop-shadow-[0_8px_0_rgba(0,0,0,.25)]"
      />
    );
  }

  return <span className="text-7xl">{src}</span>;
}
