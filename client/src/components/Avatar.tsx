import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
  dataTestId?: string;
  alt?: string;
}

export default function Avatar({ 
  seed, 
  size = 32, 
  className = "", 
  dataTestId = "img-avatar",
  alt = ""
}: AvatarProps) {
  const avatarDataUri = useMemo(() => {
    const avatar = createAvatar(thumbs, {
      seed,
      size,
    });
    return avatar.toDataUri();
  }, [seed, size]);

  return (
    <img
      src={avatarDataUri}
      alt={alt}
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
      data-testid={dataTestId}
      loading="lazy"
      decoding="async"
    />
  );
}
