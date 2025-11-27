import { Shield, Menu, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { isConnected, account, connect, disconnect, isConnecting } = useWeb3();

  const handleWalletClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10">
      <div className="container px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-2 neon-glow-cyan">
              <Shield className="w-full h-full text-background" />
            </div>
            <span className="text-xl font-bold gradient-text-primary">BlockVerify</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm hover:text-primary transition-colors">How It Works</a>
            <button 
              onClick={() => navigate('/verify')}
              className="text-sm hover:text-primary transition-colors"
            >
              Verify
            </button>
            <a href="#pricing" className="text-sm hover:text-primary transition-colors">Pricing</a>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="hover:bg-primary/10"
              onClick={() => navigate('/student')}
            >
              Sign In
            </Button>
            
            {/* Wallet Connection */}
            <Button
              onClick={handleWalletClick}
              disabled={isConnecting}
              className={`${
                isConnected 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-primary hover:bg-primary/90"
              } text-background`}
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isConnecting ? "Connecting..." : 
               isConnected ? formatAddress(account!) : "Connect Wallet"}
            </Button>

            <Button 
              variant="outline"
              className="border-primary/50 hover:border-primary hover:bg-primary/10 text-primary"
              onClick={() => navigate('/admin')}
            >
              Admin
            </Button>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-4 animate-slide-up">
            <a href="#features" className="block py-2 hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="block py-2 hover:text-primary transition-colors">How It Works</a>
            <button 
              onClick={() => navigate('/verify')}
              className="block py-2 hover:text-primary transition-colors text-left w-full"
            >
              Verify
            </button>
            <a href="#pricing" className="block py-2 hover:text-primary transition-colors">Pricing</a>
            
            <div className="flex flex-col gap-2 pt-4">
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate('/student')}
              >
                Sign In
              </Button>
              
              <Button
                onClick={handleWalletClick}
                disabled={isConnecting}
                className={`w-full ${
                  isConnected 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-primary hover:bg-primary/90"
                } text-background`}
              >
                <Wallet className="w-4 h-4 mr-2" />
                {isConnecting ? "Connecting..." : 
                 isConnected ? formatAddress(account!) : "Connect Wallet"}
              </Button>
              
              <Button 
                variant="outline"
                className="w-full border-primary/50 hover:border-primary hover:bg-primary/10 text-primary"
                onClick={() => navigate('/admin')}
              >
                Admin
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
