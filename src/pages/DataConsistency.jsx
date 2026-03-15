import React from "react";
import { Shield } from "lucide-react";

// Page supprimée — redirige vers AuditComplet
export default function DataConsistency() {
  React.useEffect(() => {
    window.location.replace("/AuditComplet");
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Shield size={32} color="#1a1f5e" />
    </div>
  );
}