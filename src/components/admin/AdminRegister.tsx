import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface AdminRegisterProps {
  onRegistrationSuccess: () => void;
}

export const AdminRegister: React.FC<AdminRegisterProps> = ({ onRegistrationSuccess }) => {
  const [formData, setFormData] = useState({
    email: 'admin@certisign.com',
    password: 'admin123',
    name: 'System Administrator'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:4001/api/admin/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Admin Account Created",
          description: "Demo admin account created successfully!",
        });
        onRegistrationSuccess();
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : 'Failed to create admin account',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="corporate-card p-8 max-w-md mx-auto shadow-lg">
      <h3 className="text-2xl font-semibold text-foreground mb-6">Create Admin Account</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="corporate-input"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Password</label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="corporate-input"
            required
            minLength={6}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Name</label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="corporate-input"
            required
          />
        </div>
        
        <Button 
          type="submit" 
          className="corporate-button-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Admin Account'}
        </Button>
      </form>
      
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          This will create an admin account that you can use to access the admin dashboard.
        </p>
      </div>
    </div>
  );
};