"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps a landing section and adds the `in` class when it enters the viewport.
 * Each section observes its own ref instead of a global querySelectorAll, so it
 * does not depend on mount order.
 */
export function RevealSection({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={"reveal " + className}>
      {children}
    </section>
  );
}
