
import React, { useState } from 'react';
import { Info, Shield, Link, CheckCircle, Hash, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const BlockchainMenu = () => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Blockchain Verification</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 border shadow-lg">
          <DropdownMenuLabel className="font-semibold">Blockchain Verification</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setIsInfoOpen(true)} className="cursor-pointer">
            <Info className="w-4 h-4 mr-2" />
            How it works
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <a href="/verify" className="cursor-pointer">
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify a diploma
            </a>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Powered by certera.ink
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Blockchain Diploma Verification
            </DialogTitle>
            <DialogDescription>
              Understanding how certera.ink ensures your diplomas are tamper-proof and verifiable
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔒 What is Blockchain Verification?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Blockchain verification makes your diplomas impossible to fake or tamper with. When you sign a diploma 
                  to the blockchain, certera.ink creates a unique cryptographic fingerprint and stores it permanently 
                  on a decentralized network.
                </p>
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">⚙️ How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg">
                    <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">1. Content Hashing</h4>
                      <p className="text-xs text-muted-foreground">
                        Your diploma's HTML and CSS are combined and processed through SHA-256 cryptographic hashing, 
                        creating a unique digital fingerprint.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">2. certera.ink Signature</h4>
                      <p className="text-xs text-muted-foreground">
                        certera.ink signs the hash with its private key, creating an unforgeable digital signature
                        that proves authenticity.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg">
                    <Link className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">3. Blockchain Storage</h4>
                      <p className="text-xs text-muted-foreground">
                        The signature, hash, and metadata are permanently stored on the blockchain, 
                        creating an immutable record.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">4. Verification</h4>
                      <p className="text-xs text-muted-foreground">
                        Anyone can verify your diploma by checking the content hash against the blockchain record 
                        and validating certera.ink's signature.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">✨ Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Tamper-Proof
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Any modification to the diploma content will break the cryptographic hash, 
                      making tampering immediately detectable.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Permanent Record
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Blockchain records are immutable and permanent, ensuring your diploma 
                      verification will always be available.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Global Verification
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Anyone, anywhere in the world can verify your diploma's authenticity 
                      using just the diploma ID.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Link className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      No Central Authority
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Decentralized verification means no single point of failure or 
                      dependency on any institution.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔐 Privacy & Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>Privacy-First:</strong> Only hashed versions of personal information are stored on the blockchain.</p>
                  <p><strong>certera.ink Authority:</strong> Only certera.ink can create valid signatures using our secure private key.</p>
                  <p><strong>Open Verification:</strong> The verification process is transparent and can be audited by anyone.</p>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔧 Technical Implementation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-2 font-mono bg-muted p-3 rounded">
                  <p><strong>Hashing:</strong> SHA-256 cryptographic hash function</p>
                  <p><strong>Storage:</strong> Simulated blockchain (production ready for real chains)</p>
                  <p><strong>Signature:</strong> certera.ink private key + content hash + recipient</p>
                  <p><strong>Verification:</strong> Content hash matching + signature validation</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
