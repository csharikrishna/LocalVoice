import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Check,
  Instagram,
  Send,
  MessageCircle,
  Share2,
  Facebook,
  QrCode,
  Download,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toBlob } from "html-to-image";
import { toast } from "sonner";

interface ShareRecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  category: string;
  location: string;
}

export const ShareRecordDialog = ({
  isOpen,
  onClose,
  token,
  category,
  location,
}: ShareRecordDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const shareContent = useMemo(() => {
    const appUrl = import.meta.env.VITE_APP_URL || "https://localvoice.web.app";
    const appName = import.meta.env.VITE_APP_NAME || "LocalVoice";
    return {
      url: `${appUrl}/track?token=${token}`,
      text: `I just reported an issue (${category}) at ${location} via ${appName}! Help me get it resolved by upvoting. 👇`,
      title: `${appName} Report: ${category}`,
    };
  }, [token, category, location]);

  const getReceiptBlob = async (): Promise<Blob | null> => {
    const el = document.getElementById("official-report-dossier");
    if (!el) return null;
    try {
      return await toBlob(el, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        skipFonts: true,
        filter: (node) => (node as HTMLElement).id !== "scanner-line",
      });
    } catch (err) {
      return null;
    }
  };

  const copyImageToClipboard = async () => {
    try {
      const blob = await getReceiptBlob();
      if (!blob) return false;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Image copied! 📸", {
        description: "You can now hit 'Paste' (Ctrl+V) in the app to attach the photo!",
      });
      return true;
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
      toast.info("Browser doesn't support background image copying. Please use download instead.");
      return false;
    }
  };

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        const blob = await getReceiptBlob();
        const filesArray: File[] = [];
        if (blob) {
          filesArray.push(new File([blob], `receipt-${token}.png`, { type: "image/png" }));
        }

        const shareData: ShareData = {
          title: shareContent.title,
          text: shareContent.text,
          url: shareContent.url,
        };

        if (
          filesArray.length > 0 &&
          navigator.canShare &&
          navigator.canShare({ files: filesArray })
        ) {
          shareData.files = filesArray;
        }

        await navigator.share(shareData);
      } catch (err: any) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Share failed", err);
        }
      }
    } else {
      handleCopyLink();
    }
  }, [shareContent, token]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareContent.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareContent.url]);

  const handleShare = useCallback(
    async (platform: string) => {
      // 1. Auto-copy the receipt image to clipboard FIRST, while the document still has user focus!
      await copyImageToClipboard();

      const encodedText = encodeURIComponent(shareContent.text);
      const encodedUrl = encodeURIComponent(shareContent.url);
      const encodedTitle = encodeURIComponent(shareContent.title);

      const urls: Record<string, string> = {
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      };

      // 2. Open the URL in a new window/tab after the clipboard is successfully written to
      window.open(urls[platform], "_blank", "noopener,noreferrer,width=600,height=700");
    },
    [shareContent],
  );

  const handleInstagram = useCallback(async () => {
    navigator.clipboard.writeText(shareContent.url);
    await copyImageToClipboard();
    alert(
      "Image & Link copied! Paste the image into your Instagram Story or DM, and add the link!",
    );
  }, [shareContent.url]);

  const socialButtons = [
    {
      id: "twitter",
      name: "Twitter",
      icon: <Twitter className="w-5 h-5" />,
      colorClass: "hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]",
      action: () => handleShare("twitter"),
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: <Facebook className="w-5 h-5" />,
      colorClass: "hover:bg-[#1877F2]/10 hover:text-[#1877F2]",
      action: () => handleShare("facebook"),
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: <MessageCircle className="w-5 h-5" />,
      colorClass: "hover:bg-[#25D366]/10 hover:text-[#25D366]",
      action: () => handleShare("whatsapp"),
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: <Send className="w-5 h-5" />,
      colorClass: "hover:bg-[#0088cc]/10 hover:text-[#0088cc]",
      action: () => handleShare("telegram"),
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: <Linkedin className="w-5 h-5" />,
      colorClass: "hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]",
      action: () => handleShare("linkedin"),
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: <Instagram className="w-5 h-5" />,
      colorClass: "hover:bg-[#E1306C]/10 hover:text-[#E1306C]",
      action: handleInstagram,
    },
    {
      id: "reddit",
      name: "Reddit",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
      colorClass: "hover:bg-[#FF4500]/10 hover:text-[#FF4500]",
      action: () => handleShare("reddit"),
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white shadow-2xl rounded-2xl">
        <div className="px-6 pt-6 pb-3 text-center space-y-1">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Share2 className="w-6 h-6 text-slate-800" />
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900">
            Share Your Report
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Get more eyes on this issue to accelerate resolution.
          </DialogDescription>
        </div>

        <div className="px-6 pb-6">
          <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="relative overflow-hidden group rounded-xl p-5 bg-slate-900 border border-slate-800">
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase mb-1">
                    Secure Tracking Token
                  </p>
                  <div className="text-2xl font-mono font-black tracking-wider text-white">
                    {token}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-xl h-12 w-12 transition-all ${
                    showQr
                      ? "bg-white text-slate-900 hover:bg-slate-100"
                      : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}
                  onClick={() => setShowQr(!showQr)}
                >
                  <QrCode className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {showQr && (
              <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 mb-4">
                  <QRCodeSVG value={shareContent.url} size={160} level="H" includeMargin={false} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Share to feed
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {socialButtons.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={btn.action}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-transparent hover:border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm transition-all duration-200 text-slate-500 ${btn.colorClass}`}
                    title={btn.name}
                  >
                    {btn.icon}
                    <span className="text-[10px] font-bold tracking-wide">{btn.name}</span>
                  </button>
                ))}
              </div>

              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <Button
                  variant="secondary"
                  className="w-full gap-2 rounded-xl h-11 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                  onClick={handleNativeShare}
                >
                  <Share2 className="w-4 h-4" />
                  More options...
                </Button>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label
                htmlFor="link"
                className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1"
              >
                Direct Link
              </Label>
              <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 transition-all">
                <Input
                  id="link"
                  value={shareContent.url}
                  readOnly
                  className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0 font-mono text-xs px-3 text-slate-500"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  size="sm"
                  className="shrink-0 h-9 px-4 rounded-lg gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
