import "./regional-presence.css";

const countries = [
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Honduras", flag: "🇭🇳" },
  { name: "Guatemala", flag: "🇬🇹" },
  { name: "República Dominicana", flag: "🇩🇴" },
  { name: "México", flag: "🇲🇽" },
  { name: "El Salvador", flag: "🇸🇻" },
  { name: "Perú", flag: "🇵🇪" },
];

export default function RegionalPresence() {
  return (
    <section className="regionalPresence" aria-label="Presencia de OR-K en Latinoamérica">
      <div className="regionalBannerLabel"><span>OR-K</span> Sin fronteras <b aria-hidden="true">↗</b></div>
      <div className="regionalMarquee">
        <div className="regionalTrack">
          {[0, 1].map(copy => (
            <ul className="regionalCountries" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {countries.map(({ name, flag }) => (
                <li key={name}><span className="regionalFlag" aria-hidden="true">{flag}</span><span>{name}</span><b aria-hidden="true">✳</b></li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
