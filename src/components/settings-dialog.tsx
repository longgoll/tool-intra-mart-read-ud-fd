import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppContext } from '@/contexts/AppContext';
import { useNavigate } from '@tanstack/react-router';
import { 
  Trash2, 
  Moon, 
  Sun, 
  Monitor, 
  Home,
  Type,
  AlertCircle,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { clearData, stats } = useAppContext();
  const navigate = useNavigate();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [fontSize, setFontSize] = useState(
    localStorage.getItem('editor-font-size') || '14'
  );

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearData();
      toast.success('Đã xóa tất cả dữ liệu thành công', {
        description: 'Bạn có thể upload file mới ngay bây giờ',
        icon: <Check className="h-4 w-4" />,
      });
      onOpenChange(false);
      setShowClearConfirm(false);
      // Navigate to upload page
      navigate({ to: '/' });
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error('Không thể xóa dữ liệu', {
        description: 'Vui lòng thử lại sau',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleGoToUpload = () => {
    onOpenChange(false);
    navigate({ to: '/' });
  };

  const handleFontSizeChange = (value: string) => {
    setFontSize(value);
    localStorage.setItem('editor-font-size', value);
    // Trigger custom event to notify editor
    window.dispatchEvent(
      new CustomEvent('editor-font-size-change', { detail: value })
    );
    toast.success('Đã thay đổi kích thước font', {
      description: `Font size: ${value}px`,
    });
  };

  const getThemeIcon = (themeValue: string) => {
    switch (themeValue) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cài đặt</DialogTitle>
            <DialogDescription>
              Tùy chỉnh giao diện và quản lý dữ liệu của bạn
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Theme Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getThemeIcon(theme || 'system')}
                <Label htmlFor="theme" className="text-base font-semibold">
                  Giao diện
                </Label>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Chọn theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Sáng</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Tối</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Theo hệ thống</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Thay đổi giao diện sáng/tối của ứng dụng
              </p>
            </div>

            <Separator />

            {/* Font Size Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <Label htmlFor="fontSize" className="text-base font-semibold">
                  Kích thước chữ trong code editor
                </Label>
              </div>
              <Select value={fontSize} onValueChange={handleFontSizeChange}>
                <SelectTrigger id="fontSize">
                  <SelectValue placeholder="Chọn kích thước" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12px (Nhỏ)</SelectItem>
                  <SelectItem value="14">14px (Mặc định)</SelectItem>
                  <SelectItem value="16">16px (Lớn)</SelectItem>
                  <SelectItem value="18">18px (Rất lớn)</SelectItem>
                  <SelectItem value="20">20px (Cực lớn)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Điều chỉnh kích thước font trong Monaco Editor
              </p>
            </div>

            <Separator />

            {/* Data Management */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quản lý dữ liệu</Label>
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số categories:</span>
                  <span className="font-medium">{stats.categoryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số definitions:</span>
                  <span className="font-medium">{stats.definitionCount}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleGoToUpload}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Quay lại trang upload
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setShowClearConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa tất cả dữ liệu
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Clear Data */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Xác nhận xóa dữ liệu
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> dữ liệu không?
              </p>
              <p>Thao tác này sẽ xóa:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{stats.categoryCount} categories</li>
                <li>{stats.definitionCount} definitions</li>
                <li>Tất cả search index</li>
              </ul>
              <p className="font-semibold text-destructive">
                Thao tác này không thể hoàn tác!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isClearing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa tất cả
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
