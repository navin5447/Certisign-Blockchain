import { Shield, Zap, Lock, Users, FileCheck, Globe } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Blockchain Anchored",
    description: "Every certificate is cryptographically signed and anchored on Polygon blockchain for immutable verification.",
    gradient: "from-primary to-secondary"
  },
  {
    icon: Zap,
    title: "Instant Verification",
    description: "Scan QR codes or paste token IDs for real-time verification with complete audit trails and provenance.",
    gradient: "from-secondary to-accent"
  },
  {
    icon: Lock,
    title: "Tamper-Proof",
    description: "W3C Verifiable Credentials with cryptographic signatures ensure certificates cannot be forged or altered.",
    gradient: "from-accent to-primary"
  },
  {
    icon: Users,
    title: "Multi-Tenant Platform",
    description: "Enterprise controls for universities with SSO, RBAC, KYC workflows, and gasless meta-transactions.",
    gradient: "from-primary to-secondary"
  },
  {
    icon: FileCheck,
    title: "Batch Issuance",
    description: "Issue thousands of certificates simultaneously with CSV import, visual progress tracking, and cost optimization.",
    gradient: "from-secondary to-accent"
  },
  {
    icon: Globe,
    title: "Global Standards",
    description: "Built on W3C DID and Verifiable Credentials standards with IPFS storage and ERC-721 smart contracts.",
    gradient: "from-accent to-primary"
  }
];

export const Features = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Enterprise-Grade <span className="gradient-text-primary">Credentialing</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Production-ready platform trusted by universities, national boards, and employers worldwide
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-panel p-8 hover:scale-105 transition-all duration-300 group animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-3 mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-full h-full text-background" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
