"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToggleFollow } from "@/lib/queries";

export function FollowButton({
  userId,
  username,
  isFollowing,
  size = "md",
  full,
}: {
  userId: string;
  username: string;
  isFollowing: boolean;
  size?: ButtonProps["size"];
  full?: boolean;
}) {
  const toggle = useToggleFollow();
  const [following, setFollowing] = useState(isFollowing);
  const [hover, setHover] = useState(false);

  return (
    <Button
      size={size}
      full={full}
      variant={following ? "secondary" : "primary"}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        setFollowing((f) => !f);
        toggle.mutate(
          { id: userId, username, following },
          { onError: () => setFollowing(following) },
        );
      }}
      className="min-w-[88px]"
    >
      {following ? (hover ? "Unfollow" : "Following") : "Follow"}
    </Button>
  );
}
