import ScalaCODLogo, { ScalaCODBrandName } from "@/components/ScalaCODLogo";

const AuthLogo = () => (
  <div className="flex flex-col items-center gap-2 mb-8">
    <ScalaCODLogo size={48} />
    <div className="text-center">
      <h1 className="text-2xl font-bold">
        <ScalaCODBrandName scalaClass="text-foreground" />
      </h1>
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Obsidian Edition
      </span>
    </div>
  </div>
);

export default AuthLogo;
