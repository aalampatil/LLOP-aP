import { SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { Moon, Plus, Sun, Vote, Zap } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { SignedInView, SignedOutView } from "../auth/auth-views";
import { useTheme } from "../../hooks/use-theme";

export function Header() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="premium-header sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5">
        <button className="flex items-center gap-3 text-left" onClick={() => navigate("/")} type="button">
          <span className="brand-mark size-11">
            <Vote className="size-6" />
          </span>
          <span>
            <span className="block text-xl font-black leading-none tracking-tight">LLOP</span>
            <span className="block text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              live polling
            </span>
          </span>
        </button>
        <nav className="hidden items-center gap-2 md:flex">
          <NavLink className={({ isActive }) => `top-nav-pill ${isActive ? "is-active" : ""}`} to="/">
            Home
          </NavLink>
          <NavLink className={({ isActive }) => `top-nav-pill ${isActive ? "is-active" : ""}`} to="/builder">
            Builder
          </NavLink>
          <button className="top-nav-pill" onClick={() => navigate("/#workspace")} type="button">
            Workspace
          </button>
          <button className="top-nav-pill" onClick={() => navigate("/builder")} type="button">
            <Zap className="size-3.5" />
            Launch
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <button
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="icon-button"
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            type="button"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <SignedOutView>
            <SignInButton mode="modal">
              <button className="neo-button bg-white text-black" type="button">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="neo-button bg-main" type="button">
                Start
              </button>
            </SignUpButton>
          </SignedOutView>
          <SignedInView>
            <button
              className="neo-button hidden bg-main sm:inline-flex"
              onClick={() => navigate("/builder")}
              type="button"
            >
              <Plus className="size-4" /> New poll
            </button>
            <UserButton />
          </SignedInView>
        </div>
      </div>
    </header>
  );
}
