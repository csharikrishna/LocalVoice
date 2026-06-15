import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { Logo } from "@/components/civic/Nav";

export function Footer() {
  return (
    <footer style={{ background: "#0F172A", color: "rgba(255,255,255,0.6)" }}>
      <div className="container-x py-16 grid grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5 text-white">
            <Logo />
            <span className="font-semibold">LocalVoice</span>
          </div>
          <p className="mt-3 text-sm">Smarter communities start with a scan.</p>
          <a
            href="https://github.com/csharikrishna/LocalVoice"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] mt-5 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="GitHub"
          >
            <Github size={18} />
          </a>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/impact" className="hover:text-white transition-colors">
                Impact &amp; SDGs
              </Link>
            </li>
            <li>
              <Link to="/research" className="hover:text-white transition-colors">
                Field Research
              </Link>
            </li>
            <li>
              <Link to="/tech" className="hover:text-white transition-colors">
                Tech &amp; Timeline
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-3">Project info</h4>
          <ul className="space-y-2 text-sm">
            <li>Institution: SV University</li>
            <li>Discipline: Community Service</li>
            <li>Academic year: 2026–27</li>
            <li>Guide: Dr. P. Ramesh</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-3">Compliance</h4>
          <span
            className="inline-flex items-center text-xs font-semibold text-white px-2.5 py-1.5 rounded-full"
            style={{ border: "1px solid rgba(255,255,255,0.3)" }}
          >
            APSCHE Certified
          </span>
          <p className="mt-4 text-sm">Built in Tirupati, Andhra Pradesh 🇮🇳</p>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="container-x py-5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span>© {new Date().getFullYear()} LocalVoice. All rights reserved.</span>
          <span>Verified under APSCHE Community Service Guidelines.</span>
        </div>
      </div>
    </footer>
  );
}
