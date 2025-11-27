import { Button } from "./ui/button";
import { ArrowRight, Mail } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <div className="glass-panel-strong p-12 md:p-16 text-center space-y-8 max-w-4xl mx-auto neon-glow-indigo">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Transform Academic{" "}
            <span className="gradient-text-primary">Credentialing?</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join leading universities in issuing blockchain-verified, tamper-proof credentials 
            that empower students and simplify verification for employers worldwide.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button size="lg" className="group text-lg px-8 bg-primary hover:bg-primary/90 text-background neon-glow-cyan">
              <Mail className="mr-2 w-5 h-5" />
              Contact Sales
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-primary/50 hover:border-primary hover:bg-primary/10 group">
              View Documentation
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground pt-4">
            No credit card required • 14-day free trial • White-glove onboarding
          </p>
        </div>
      </div>
    </section>
  );
};
