import { Reveal } from "./Reveal";

const slides = [
  {
    id: "pothole",
    title: "Potholes & Roads",
    desc: "Scan the QR code on a nearby pole to instantly report dangerous road conditions.",
    image: "/images/carousel/pothole.png",
  },
  {
    id: "streetlight",
    title: "Broken Streetlights",
    desc: "Find the LocalVoice sticker on the unlit pole and help make the streets safer at night.",
    image: "/images/carousel/streetlight.png",
  },
  {
    id: "garbage",
    title: "Garbage Pileups",
    desc: "Report uncollected waste quickly by scanning the sticker at the collection point.",
    image: "/images/carousel/garbage.png",
  },
  {
    id: "water",
    title: "Water Leaks & Drains",
    desc: "Spot an overflowing drain or leaking pipe? Scan the nearest poster to notify the city.",
    image: "/images/carousel/water.png",
  },
];

export function IssueCarousel() {
  return (
    <section className="section-y bg-slate-900 text-white overflow-hidden">
      <div className="container-x mb-8">
        <Reveal>
          <span className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>See it in action</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
            Spot a problem. Scan the poster.
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-4 text-lg text-slate-300 max-w-xl">
            Our high-visibility QR posters are placed precisely where civic issues happen. 
            Reporting takes seconds — right from the scene.
          </p>
        </Reveal>
      </div>

      {/* Horizontal Carousel Container */}
      <div className="pl-6 md:pl-10 lg:pl-0 lg:container-x">
        <div 
          className="flex overflow-x-auto gap-5 pb-8 snap-x snap-mandatory"
          style={{ 
            scrollbarWidth: "none", 
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch"
          }}
        >
          {/* Hide webkit scrollbar via inline styles or tailwind plugins, using a style block */}
          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {slides.map((slide, i) => (
            <Reveal key={slide.id} delay={i * 100} className="shrink-0 snap-start">
              <div 
                className="hide-scrollbar w-[280px] sm:w-[320px] bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-xl group cursor-grab active:cursor-grabbing"
              >
                <div className="aspect-[4/5] relative overflow-hidden bg-slate-900">
                  <img 
                    src={slide.image} 
                    alt={slide.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80" />
                  
                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <h3 className="text-xl font-bold text-white mb-2">{slide.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {slide.desc}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
          {/* Spacer for right padding on mobile scroll */}
          <div className="shrink-0 w-6 lg:w-0" />
        </div>
      </div>
    </section>
  );
}
