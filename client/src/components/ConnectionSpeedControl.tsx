import { useState } from 'react';
import { useConnectionSpeed } from '@/hooks/useConnectionSpeed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  Wifi, 
  WifiOff, 
  Zap, 
  Shield, 
  X,
  Info
} from 'lucide-react';

interface ConnectionSpeedControlProps {
  className?: string;
}

export function ConnectionSpeedControl({ className = '' }: ConnectionSpeedControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const connectionSpeed = useConnectionSpeed();

  const getConnectionIcon = () => {
    switch (connectionSpeed.connectionInfo.connectionQuality) {
      case 'poor':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'ok':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'good':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'excellent':
        return <Zap className="w-4 h-4 text-blue-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionDescription = () => {
    const { connectionInfo } = connectionSpeed;
    
    if (connectionInfo.effectiveType !== 'unknown') {
      return `${connectionInfo.effectiveType.toUpperCase()} · ${connectionInfo.downlink.toFixed(1)} Mbps · ${connectionInfo.connectionQuality}`;
    }
    
    return connectionSpeed.isLoading ? 'Detecting...' : 'Speed unknown';
  };

  const getQualityDescription = (preference: string) => {
    switch (preference) {
      case 'data-saver':
        return 'Lower quality images and videos, minimal data usage';
      case 'high-quality':
        return 'Highest quality images and videos, ignores connection speed';
      case 'auto':
        return 'Automatically adjusts quality based on connection speed';
      default:
        return '';
    }
  };

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          variant="outline"
          className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
          data-testid="button-open-connection-control"
        >
          {getConnectionIcon()}
          <span className="ml-2 text-sm font-medium">Quality Settings</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-80 shadow-xl border-gray-200 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Connection & Quality
            </CardTitle>
            <Button
              onClick={() => setIsOpen(false)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              data-testid="button-close-connection-control"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              <div>
                <div className="font-medium text-sm">Connection Speed</div>
                <div className="text-xs text-gray-600">{getConnectionDescription()}</div>
              </div>
            </div>
            <Badge variant={connectionSpeed.connectionInfo.isSlowConnection ? 'destructive' : 'default'}>
              {connectionSpeed.connectionInfo.isSlowConnection ? 'Slow' : 'Fast'}
            </Badge>
          </div>

          {/* Quality Preference */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quality Preference</Label>
            <RadioGroup
              value={connectionSpeed.userPreference}
              onValueChange={(value) => connectionSpeed.setUserPreference(value as 'auto' | 'high-quality' | 'data-saver')}
              className="space-y-3"
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="auto" id="auto" className="mt-1" />
                <div className="grid gap-1">
                  <Label htmlFor="auto" className="text-sm font-medium cursor-pointer">
                    Automatic (Recommended)
                  </Label>
                  <p className="text-xs text-gray-600">{getQualityDescription('auto')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="high-quality" id="high-quality" className="mt-1" />
                <div className="grid gap-1">
                  <Label htmlFor="high-quality" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                    High Quality <Zap className="w-3 h-3 text-blue-500" />
                  </Label>
                  <p className="text-xs text-gray-600">{getQualityDescription('high-quality')}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="data-saver" id="data-saver" className="mt-1" />
                <div className="grid gap-1">
                  <Label htmlFor="data-saver" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                    Data Saver <Shield className="w-3 h-3 text-green-500" />
                  </Label>
                  <p className="text-xs text-gray-600">{getQualityDescription('data-saver')}</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Current Settings Summary */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">Current Settings:</div>
                <ul className="text-xs space-y-1">
                  <li>• Image quality: {connectionSpeed.recommendedImageQuality}%</li>
                  <li>• Auto-load videos: {connectionSpeed.shouldAutoloadVideo ? 'Yes' : 'No'}</li>
                  <li>• High-res images: {connectionSpeed.shouldLoadHighQuality ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Network API Support Info */}
          {!connectionSpeed.supportsNetworkAPI && (
            <div className="text-xs text-gray-500 text-center">
              Using performance-based speed detection (Network API not supported)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ConnectionSpeedControl;