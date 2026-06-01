"use client";
import { useEffect, useRef } from "react";
import { TG_BOT } from "@/config";

export default function TelegramLogin() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || ref.current.querySelector("script")) return;
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", TG_BOT);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "10");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-auth-url", "https://bayluxhome.com/api/tg-auth");
    ref.current.appendChild(s);
  }, []);
  return <div ref={ref} />;
}
