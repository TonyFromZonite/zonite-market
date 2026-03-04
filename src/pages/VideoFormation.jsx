import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function VideoFormation() {
  const [compteVendeur, setCompteVendeur] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTerminee, setVideoTerminee] = useState(false);
  const [accepte, setAccepte] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const charger = async () => {
      try {
        const u = await base44.auth.me().catch(() => null);
        if (!u?.email) {
          window.location.href = createPageUrl("Connexion");
          return;
        }

        const comptes = await base44.entities.CompteVendeur.filter({ user_email: u.email });
        if (comptes.length > 0) setCompteVendeur(comptes[0]);

        // Récupérer le lien YouTube depuis la config
        const configs = await base44.entities.ConfigApp.filter({ cle: "lien_youtube_formation" });
        if (configs.length > 0 && configs[0].valeur) {
          let url = configs[0].valeur;
          // Convertir URL normale en URL embed si nécessaire
          if (url.includes("youtube.com/watch?v=")) {
            const videoId = url.split("v=")[1]?.split("&")[0];
            if (videoId) url = `https://www.youtube.com/embed/${videoId}`;
          }
          setVideoUrl(url);
        } else {
          setErreur("Aucune vidéo de formation configurée. Contactez l'administrateur.");
        }
      } catch (err) {
        setErreur("Erreur lors du chargement");
      }
    };
    charger();
  }, []);

  const confirmer = async () => {
    if (!accepte) return;
    setEnCours(true);
    await base44.entities.CompteVendeur.update(compteVendeur.id, {
      video_vue: true,
      conditions_acceptees: true,
      catalogue_debloque: true,
    });
    await base44.entities.NotificationVendeur.create({
      vendeur_email: compteVendeur.user_email,
      titre: "Catalogue débloqué !",
      message: "Félicitations ! Vous avez accès au catalogue produits ZONITE. Créez votre première commande !",
      type: "succes",
    });
    setEnCours(false);
    setEtape(3);
  };

  const sections = [
    { emoji: "🏢", titre: "Présentation ZONITE", desc: "Découvrez notre entreprise et notre vision du dropshipping au Cameroun." },
    { emoji: "💰", titre: "Système de commissions", desc: "Comprenez comment sont calculées vos commissions sur chaque vente." },
    { emoji: "📦", titre: "Fonctionnement Dropshipping", desc: "Comment passer des commandes, la livraison et le suivi client." },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a304769dda004762ee3a57/be2e82d8c_410287629_332500566218921_7304714630055582730_n.jpg"
            alt="Zonite" className="h-12 w-12 rounded-xl object-contain mx-auto mb-2"
          />
          <h1 className="text-xl font-bold text-[#1a1f5e]">Formation ZONITE</h1>
          <p className="text-sm text-slate-500">Obligatoire avant d'accéder au catalogue</p>
        </div>

        {etape === 3 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Catalogue débloqué !</h2>
            <p className="text-sm text-slate-500 mb-6">Bienvenue dans la famille ZONITE. Vous pouvez maintenant accéder aux produits et créer vos premières commandes.</p>
            <Button onClick={() => navigate(createPageUrl("CatalogueVendeur"))} className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold">
              Voir le catalogue →
            </Button>
          </div>
        ) : (
          <>
            {/* Vidéo simulée */}
            <div className="bg-[#1a1f5e] rounded-2xl overflow-hidden mb-4 relative">
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 cursor-pointer hover:bg-white/30 transition-colors"
                    onClick={() => setVideoTerminee(true)}>
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                  <p className="font-bold text-lg">Présentation ZONITE Dropshipping</p>
                  <p className="text-slate-300 text-sm">Durée : ~15 minutes</p>
                  {!videoTerminee && (
                    <button onClick={() => setVideoTerminee(true)} className="mt-3 text-xs text-[#F5C518] underline">
                      Marquer comme vue
                    </button>
                  )}
                </div>
              </div>
              {videoTerminee && (
                <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">✓ Vue</div>
              )}
            </div>

            {/* Contenu de la formation */}
            <div className="space-y-3 mb-5">
              {sections.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <span className="text-2xl">{s.emoji}</span>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{s.titre}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Acceptation politiques + confirmation */}
            {videoTerminee && !accepte && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Politiques de confidentialité et conditions</h3>
                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-2">
                    <p><strong>🔒 Confidentialité :</strong> Je m'engage à ne pas révéler les prix internes ZONITE à des tiers.</p>
                    <p><strong>💰 Commissions :</strong> Je comprends que mes commissions sont basées sur la différence entre le prix de gros et mon prix de vente.</p>
                    <p><strong>👥 Professionnalisme :</strong> Je m'engage à traiter les clients avec respect et professionnalisme.</p>
                    <p><strong>⚖️ Sanctions :</strong> Je comprends que tout abus ou violation entraîne la suspension de mon compte.</p>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <input
                    type="checkbox"
                    checked={accepte}
                    onChange={e => setAccepte(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    J'ai lu et j'accepte les politiques de confidentialité et les conditions d'utilisation ZONITE
                  </span>
                </label>

                <Button
                  onClick={async () => {
                    if (!accepte) return;
                    setEnCours(true);
                    try {
                      await base44.entities.CompteVendeur.update(compteVendeur.id, {
                        video_vue: true,
                        conditions_acceptees: true,
                        catalogue_debloque: true,
                      });
                      await base44.entities.NotificationVendeur.create({
                        vendeur_email: compteVendeur.user_email,
                        titre: "Catalogue débloqué !",
                        message: "Félicitations ! Vous avez accès au catalogue produits ZONITE. Créez votre première commande !",
                        type: "succes",
                      });
                      setEnCours(false);
                    } catch (err) {
                      setErreur("Erreur lors de la finalisation");
                      setEnCours(false);
                    }
                  }}
                  disabled={!accepte || enCours}
                  className="w-full bg-[#F5C518] hover:bg-[#e0b010] text-[#1a1f5e] font-bold h-12"
                >
                  {enCours ? <Loader2 className="w-5 h-5 animate-spin" /> : "Débloquer le catalogue →"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}