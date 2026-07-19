"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./KtmTracker.module.css";
import {
  STATIONS,
  DEFAULT_ORIGIN,
  DEFAULT_DEST,
  getTables,
  getTrips,
  minutesLabel,
  type Trip,
} from "@/lib/schedule";

const pad = (n: number) => String(n).padStart(2, "0");

function FlapNumber({ text }: { text: string }) {
  const prevRef = useRef<string | null>(null);
  const [flippedIdx, setFlippedIdx] = useState<Set<number>>(new Set());

  useEffect(() => {
    const prev = prevRef.current;
    if (prev && prev.length === text.length) {
      const changed = new Set<number>();
      for (let i = 0; i < text.length; i++) {
        if (prev[i] !== text[i]) changed.add(i);
      }
      setFlippedIdx(changed);
      const t = setTimeout(() => setFlippedIdx(new Set()), 180);
      prevRef.current = text;
      return () => clearTimeout(t);
    }
    prevRef.current = text;
  }, [text]);

  return (
    <span className={styles.flapRow}>
      {text.split("").map((c, i) => (
        <span className={styles.flapBox} key={i}>
          <span className={`${styles.flapChar} ${flippedIdx.has(i) ? styles.flapping : ""}`}>{c}</span>
        </span>
      ))}
    </span>
  );
}

export default function KtmTracker() {
  const [now, setNow] = useState(new Date());
  const [originIdx, setOriginIdx] = useState(DEFAULT_ORIGIN);
  const [destIdx, setDestIdx] = useState(DEFAULT_DEST);
  const [forceHoliday, setForceHoliday] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  // The specific train the user picked to be reminded about, identified by its departure
  // time in minutes-since-midnight. null = no train selected yet.
  const [selectedDep, setSelectedDep] = useState<number | null>(null);
  const firedForDep = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const { isWeekend } = getTables(forceHoliday, now);
  const trips: Trip[] = getTrips(originIdx, destIdx, forceHoliday, now);

  const upcoming = trips.filter((t) => t.dep >= nowMin - 0.01);
  const past = trips.filter((t) => t.dep < nowMin - 0.01);
  const justDeparted = past.length > 0 ? past[past.length - 1] : null;
  const next = upcoming[0];
  const following = upcoming.slice(1, 6);
  const lastDeparted = trips.length > 0 && upcoming.length === 0;

  const originName = STATIONS[originIdx];
  const destName = STATIONS[destIdx];

  const selectedTrip = selectedDep != null ? upcoming.find((t) => t.dep === selectedDep) ?? null : null;

  // Clear the selection once the chosen train has departed.
  useEffect(() => {
    if (selectedDep != null && !selectedTrip) {
      setSelectedDep(null);
      firedForDep.current = null;
    }
  }, [selectedDep, selectedTrip]);

  // Fire a local notification 15 minutes before the SELECTED train's departure.
  useEffect(() => {
    if (!selectedTrip || permission !== "granted") return;
    const remaining = Math.round(selectedTrip.dep - nowMin);
    if (remaining === 15 && firedForDep.current !== selectedTrip.dep) {
      firedForDep.current = selectedTrip.dep;
      try {
        new Notification("Tren dalam 15 minit 🚆", {
          body: `${originName} → ${destName} · berlepas ${selectedTrip.depStr}`,
          icon: "/icons/icon-192.png",
        });
      } catch {
        // ignore
      }
    }
  }, [nowMin, selectedTrip, permission, originName, destName]);

  function handleSwap() {
    setOriginIdx(destIdx);
    setDestIdx(originIdx);
    setSelectedDep(null);
    firedForDep.current = null;
  }

  function handleReset() {
    setOriginIdx(DEFAULT_ORIGIN);
    setDestIdx(DEFAULT_DEST);
    setSelectedDep(null);
    firedForDep.current = null;
  }

  async function handleSelectTrain(dep: number) {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Toggle off if this train is already selected.
    if (selectedDep === dep) {
      setSelectedDep(null);
      firedForDep.current = null;
      return;
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      return;
    }
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
    }
    firedForDep.current = null;
    setSelectedDep(dep);
  }

  function BellButton({ dep }: { dep: number }) {
    const active = selectedDep === dep;
    return (
      <button
        className={`${styles.bellBtn} ${active ? styles.bellBtnOn : ""}`}
        onClick={() => handleSelectTrain(dep)}
        type="button"
        title={active ? "Batalkan ingatan" : "Ingatkan saya 15 minit sebelum tren ini"}
        disabled={permission === "unsupported"}
      >
        {active ? "🔔" : "🔕"}
      </button>
    );
  }

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.iconWrap}>🚆</div>
          <div className={styles.brandText}>
            <h1>KTM TRACKER</h1>
            <p>Laluan Tanjung Malim &ndash; Pelabuhan Klang</p>
          </div>
        </div>
        <div className={styles.clock}>
          <small>WAKTU SEKARANG</small>
          {pad(now.getHours())}:{pad(now.getMinutes())}
          <span className={styles.clockSec}>:{pad(now.getSeconds())}</span>
        </div>
      </div>

      <div className={styles.daybadge}>
        <span>
          Jadual:{" "}
          <span className={`${styles.tag} ${isWeekend ? styles.tagWeekend : styles.tagWeekday}`}>
            {isWeekend ? "Hujung Minggu / Cuti Am" : "Hari Bekerja"}
          </span>
        </span>
        <label>
          <input
            type="checkbox"
            checked={forceHoliday}
            onChange={(e) => setForceHoliday(e.target.checked)}
          />
          Cuti Umum
        </label>
      </div>

      <div className={styles.routeCard}>
        <div className={styles.routeRow}>
          <select value={originIdx} onChange={(e) => setOriginIdx(Number(e.target.value))}>
            {STATIONS.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
          <button className={styles.swapBtn} onClick={handleSwap} title="Tukar arah" type="button">
            ⇄
          </button>
          <select value={destIdx} onChange={(e) => setDestIdx(Number(e.target.value))}>
            {STATIONS.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.routeFooter}>
          <span>
            {originName} → {destName}
          </span>
          <button className={styles.resetLink} onClick={handleReset} type="button">
            Set semula lalai
          </button>
        </div>
      </div>

      <div className={styles.notifyStatus}>
        {permission === "unsupported" ? (
          <span>🔕 Notifikasi tidak disokong pelayar ini</span>
        ) : selectedTrip ? (
          <span className={styles.notifyStatusOn}>
            🔔 Ingatan aktif untuk tren <strong>{selectedTrip.depStr}</strong> — ketik 🔔 pada tren itu untuk batal
          </span>
        ) : (
          <span>🔕 Ketik loceng pada mana-mana tren di bawah untuk diingatkan 15 minit sebelum ia berlepas</span>
        )}
      </div>

      {permission === "denied" && (
        <div className={styles.errorNote}>
          Notifikasi disekat. Benarkan di Tetapan iOS &rarr; Safari &rarr; Notifikasi (atau tetapan app ini jika ditambah ke Skrin Utama).
        </div>
      )}

      <div className={styles.board}>
        {trips.length === 0 ? (
          <>
            <div className={styles.boardLabel}>⚠️ Laluan Sama</div>
            <div className={styles.lastcall}>SILA PILIH DUA STESEN BERBEZA</div>
          </>
        ) : lastDeparted ? (
          <>
            <div className={styles.boardLabel}>🕐 Tren Seterusnya</div>
            <div className={styles.lastcall}>TIADA LAGI TREN HARI INI</div>
            <div className={styles.routeSub}>
              Tren pertama esok dari {originName}: {trips[0].depStr}
            </div>
          </>
        ) : (
          next && (
            <>
              <div className={styles.boardLabel}>
                <span>🕐 Berlepas Dalam</span>
                <span style={{ marginLeft: "auto" }}>
                  <BellButton dep={next.dep} />
                </span>
              </div>
              <div className={styles.countdownWrap}>
                <FlapNumber text={pad(Math.min(Math.max(0, Math.ceil(next.dep - nowMin)), 99))} />
                <span className={styles.countdownUnit}>MINIT</span>
              </div>
              <div className={styles.routeLine}>
                <span>📍</span>
                <span className={styles.stn}>{originName}</span>
                <span className={styles.time}>{next.depStr}</span>
                <span className={styles.arrow}>&rarr;</span>
                <span className={styles.stn}>{destName}</span>
                <span className={styles.timeMuted}>{next.arrStr}</span>
              </div>
              <div className={styles.routeSub}>
                Tiba di {destName} dalam {minutesLabel(Math.max(0, Math.ceil(next.arr - nowMin)))} &middot; masa
                perjalanan {next.arr - next.dep} minit
              </div>
            </>
          )
        )}
      </div>

      {(justDeparted || following.length > 0) && (
        <>
          <div className={styles.sectionTitle}>Jadual</div>
          <div className={styles.list}>
            {justDeparted && (
              <div className={`${styles.row} ${styles.rowDeparted}`}>
                <div className={styles.times}>
                  <span className={styles.depStrike}>{justDeparted.depStr}</span>
                  <span className={styles.arrow}>&rarr;</span>
                  <span>{justDeparted.arrStr}</span>
                </div>
                <span className={styles.rowTag}>
                  berlepas {minutesLabel(Math.max(0, Math.ceil(nowMin - justDeparted.dep)))} lalu
                </span>
              </div>
            )}
            {following.map((t, i) => (
              <div className={styles.row} key={i}>
                <div className={styles.times}>
                  <span>{t.depStr}</span>
                  <span className={styles.arrow}>&rarr;</span>
                  <span>{t.arrStr}</span>
                </div>
                <div className={styles.rowRight}>
                  <span className={styles.rowTag}>
                    dalam {minutesLabel(Math.max(0, Math.ceil(t.dep - nowMin)))}
                  </span>
                  <BellButton dep={t.dep} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.footer}>
        Jadual hari bekerja berkuat kuasa 6 Julai 2026 &middot; jadual hujung minggu/cuti am berkuat kuasa 4 Julai 2026
        <br />
        Nota: cuti umum tidak dikesan automatik &mdash; guna suis &quot;Cuti Umum&quot; di atas.
        <br />
        KTM Komuter &middot; Laluan Tanjung Malim &ndash; Pelabuhan Klang
        <div className={styles.credit}>Developed by Akmal Amin</div>
      </div>
    </div>
  );
}
