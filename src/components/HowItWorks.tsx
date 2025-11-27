import { Upload, Database, Shield, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Institution Issues",
    description: "Authorized universities upload student credentials via single form or CSV batch import with metadata and attachments.",
    step: "01"
  },
  {
    icon: Database,
    title: "Blockchain Anchor",
    description: "Certificates are cryptographically signed, metadata pinned to IPFS, and transaction hash anchored on Polygon blockchain.",
    step: "02"
  },
  {
    icon: Shield,
    title: "Instant Verification",
    description: "Students, employers, or auditors scan QR codes or paste token IDs for real-time verification with complete provenance.",
    step: "03"
  },
  {
    icon: CheckCircle,
    title: "Trust Confirmed",
    description: "Verification engine validates on-chain anchor, IPFS metadata, cryptographic signature, and revocation status in milliseconds.",
    step: "04"
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container px-4 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            How It <span className="gradient-text-primary">Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple workflow, powerful verification — from issuance to instant global trust
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative animate-slide-up" style={{ animationDelay: `${index * 0.15}s` }}>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-20 left-full w-full h-0.5 bg-gradient-to-r from-primary to-primary/20" />
              )}
              
              <div className="glass-panel-strong p-6 text-center space-y-4 hover:scale-105 transition-all duration-300 group">
                {/* Step number */}
                <div className="text-6xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors">
                  {step.step}
                </div>
                
                {/* Icon */}
                <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-primary to-secondary p-4 neon-glow-cyan group-hover:scale-110 transition-transform">
                  <step.icon className="w-full h-full text-background" />
                </div>
                
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
