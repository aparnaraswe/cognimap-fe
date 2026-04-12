/**
 * StudentDashboard.jsx — CogniMap Student UI
 * Matches cognimap-dashboard.html reference design
 * Warm palette: sage, blush, gold · Fonts: DM Serif Display + DM Sans
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/* ─── Battery meta ─── */
const BAT = {
  aptitude:    { label: 'Cognitive Aptitude Assessment', icon: '🧩', color: '#5f8f72' },
  personality: { label: 'Personality Profile',           icon: '💜', color: '#c97d5f' },
  interest:    { label: 'Interest Profile',              icon: '🧭', color: '#c9963e' },
  default:     { label: 'Assessment',                    icon: '📋', color: '#5f8f72' },
};
const DOM_LABELS = {
  gf: 'Pattern', gv: 'Visual', gq: 'Quant',
  gc: 'Verbal',  gs: 'Speed',  gwm: 'Memory',
};

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

:root {
  --ink:         #1a2332;
  --paper:       #f5f2ed;
  --warm:        #fdfaf5;
  --sage:        #5f8f72;
  --sage-light:  #a8ccb4;
  --sage-pale:   #e8f3ec;
  --blush:       #c97d5f;
  --blush-pale:  #faeae4;
  --blush-light: #efc4b4;
  --slate:       #4a5568;
  --slate-light: #8898aa;
  --slate-pale:  #f0f2f5;
  --gold:        #c9963e;
  --gold-pale:   #fef3dc;
  --lavender:    #8b7ec8;
  --lav-pale:    #eeecf8;
  --card:        #ffffff;
  --sd-border:   rgba(26,35,50,0.08);
  --shadow:      rgba(26,35,50,0.05);
  --sidebar-bg:  #f7f3ee;
}

.sd *,.sd *::before,.sd *::after{box-sizing:border-box;margin:0;padding:0}

.sd{
  font-family:'DM Sans',sans-serif;
  background:var(--paper);
  color:var(--ink);
  min-height:100vh;
  display:flex;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}

/* ── SIDEBAR ── */
.sd-sidebar{
  width:220px;
  min-height:100vh;
  background:var(--sidebar-bg);
  border-right:1px solid var(--sd-border);
  display:flex;
  flex-direction:column;
  position:fixed;
  left:0;top:0;bottom:0;
  z-index:100;
}
.sd-sidebar-logo{
  padding:24px 22px 22px;
  border-bottom:1px solid var(--sd-border);
}
.sd-logo-mark{
  font-family:'DM Serif Display',serif;
  font-size:18px;
  color:var(--ink);
  letter-spacing:-0.2px;
}
.sd-logo-mark span{color:var(--blush)}
.sd-logo-sub{
  font-size:9.5px;
  color:var(--slate-light);
  letter-spacing:2px;
  text-transform:uppercase;
  margin-top:3px;
}

.sd-nav-section{padding:18px 0 4px}
.sd-nav-label{
  font-size:9.5px;
  letter-spacing:2px;
  text-transform:uppercase;
  color:var(--slate-light);
  padding:0 22px;
  margin-bottom:4px;
}
.sd-nav-item{
  display:flex;
  align-items:center;
  gap:10px;
  padding:9px 22px;
  font-size:13px;
  color:var(--slate);
  cursor:pointer;
  transition:all 0.15s;
  border-left:2px solid transparent;
  font-weight:400;
  border:none;background:transparent;
  width:100%;text-align:left;
  font-family:'DM Sans',sans-serif;
}
.sd-nav-item:hover{color:var(--ink);background:rgba(26,35,50,0.04)}
.sd-nav-item.active{
  color:var(--blush);
  border-left:2px solid var(--blush);
  background:var(--blush-pale);
  font-weight:500;
}
.sd-nav-icon{width:14px;height:14px;flex-shrink:0;opacity:0.5}
.sd-nav-item.active .sd-nav-icon{opacity:1}

.sd-sidebar-footer{
  margin-top:auto;
  padding:18px 22px;
  border-top:1px solid var(--sd-border);
}
.sd-user-card{display:flex;align-items:center;gap:10px}
.sd-user-avatar{
  width:32px;height:32px;
  border-radius:50%;
  background:linear-gradient(135deg,var(--sage),var(--blush));
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:600;color:white;flex-shrink:0;
}
.sd-user-name{font-size:13px;color:var(--ink);font-weight:500}
.sd-user-role{font-size:11px;color:var(--slate-light)}

/* ── MAIN ── */
.sd-main{
  margin-left:220px;
  flex:1;
  display:flex;
  flex-direction:column;
  min-height:100vh;
}

/* ── TOPBAR ── */
.sd-topbar{
  padding:16px 32px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  background:var(--warm);
  border-bottom:1px solid var(--sd-border);
  position:sticky;top:0;z-index:50;
}
.sd-topbar-left h1{
  font-family:'DM Serif Display',serif;
  font-size:20px;
  color:var(--ink);
  letter-spacing:-0.2px;
}
.sd-topbar-left p{font-size:12px;color:var(--slate-light);margin-top:2px}
.sd-topbar-right{display:flex;align-items:center;gap:8px}

.sd-btn{
  padding:7px 15px;
  border-radius:8px;
  font-size:12.5px;
  font-family:'DM Sans',sans-serif;
  cursor:pointer;
  font-weight:500;
  transition:all 0.15s;
  border:none;
}
.sd-btn-ghost{
  background:transparent;
  color:var(--slate);
  border:1px solid var(--sd-border);
}
.sd-btn-ghost:hover{background:var(--slate-pale)}
.sd-btn-primary{background:var(--blush);color:white}
.sd-btn-primary:hover{background:#b86e51}

.sd-notif-btn{
  width:34px;height:34px;
  border-radius:50%;
  border:1px solid var(--sd-border);
  background:var(--card);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;
  position:relative;
}
.sd-notif-pip{
  position:absolute;
  top:7px;right:7px;
  width:6px;height:6px;
  background:var(--blush);
  border-radius:50%;
  border:1.5px solid var(--warm);
}

/* ── CONTENT ── */
.sd-content{padding:28px 32px;flex:1}

/* ── BANNER ── */
.sd-banner{
  background:var(--card);
  border:1px solid var(--sd-border);
  border-radius:16px;
  padding:26px 30px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:20px;
  position:relative;
  overflow:hidden;
  animation:sd-fadeUp .45s .04s ease both;
}
.sd-banner-accent{
  position:absolute;
  right:0;top:0;bottom:0;
  width:260px;
  background:linear-gradient(to left, var(--sage-pale) 0%, transparent 100%);
  pointer-events:none;
}
.sd-banner-left{z-index:1}
.sd-banner-eyebrow{
  font-size:10px;
  color:var(--sage);
  letter-spacing:2px;
  text-transform:uppercase;
  font-weight:600;
  margin-bottom:7px;
}
.sd-banner-headline{
  font-family:'DM Serif Display',serif;
  font-size:22px;
  color:var(--ink);
  line-height:1.3;
  margin-bottom:14px;
}
.sd-banner-headline em{color:var(--blush);font-style:italic}
.sd-banner-tags{display:flex;gap:8px;flex-wrap:wrap}
.sd-banner-tag{
  padding:4px 11px;
  border-radius:20px;
  font-size:11.5px;
  font-weight:500;
}
.sd-tag-sage{background:rgba(95,143,114,0.12);color:var(--sage)}
.sd-tag-blush{background:rgba(201,125,95,0.12);color:var(--blush)}
.sd-tag-gold{background:rgba(201,150,62,0.12);color:var(--gold)}

.sd-banner-right{z-index:1;text-align:right;flex-shrink:0}
.sd-banner-score-label{
  font-size:10px;
  color:var(--slate-light);
  letter-spacing:1.5px;
  text-transform:uppercase;
  margin-bottom:4px;
}
.sd-banner-score{
  font-family:'DM Serif Display',serif;
  font-size:50px;
  color:var(--ink);
  line-height:1;
}
.sd-banner-score sup{
  font-size:17px;
  color:var(--blush);
  vertical-align:super;
  font-family:'DM Sans',sans-serif;
  font-weight:400;
}
.sd-banner-score-sub{font-size:12px;color:var(--sage);margin-top:4px;font-weight:500}

/* ── GRIDS ── */
.sd-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px}
.sd-g21{display:grid;grid-template-columns:1fr 300px;gap:14px;margin-bottom:16px}
.sd-g2{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:16px}

/* ── CARD ── */
.sd-card{
  background:var(--card);
  border-radius:14px;
  border:1px solid var(--sd-border);
  padding:20px 22px;
}
.sd-card-label{
  font-size:10px;
  letter-spacing:1.5px;
  text-transform:uppercase;
  color:var(--slate-light);
  margin-bottom:6px;
}
.sd-card-value{
  font-family:'DM Serif Display',serif;
  font-size:30px;
  color:var(--ink);
  line-height:1;
}
.sd-card-sub{
  font-size:12px;
  color:var(--slate-light);
  margin-top:6px;
  display:flex;
  align-items:center;
  gap:4px;
}
.sd-card-icon{
  width:34px;height:34px;
  border-radius:9px;
  display:flex;align-items:center;justify-content:center;
  margin-bottom:12px;
  font-size:15px;
}
.sd-icon-sage{background:var(--sage-pale)}
.sd-icon-blush{background:var(--blush-pale)}
.sd-icon-gold{background:var(--gold-pale)}

.sd-delta-up{color:var(--sage);font-weight:500}

.sd-mini-bars{display:flex;align-items:flex-end;gap:3px;height:30px;margin-top:12px}
.sd-mini-bar{flex:1;border-radius:3px;background:#ede9e3}

/* ── CARD TITLE ── */
.sd-card-title{
  font-family:'DM Serif Display',serif;
  font-size:16px;
  color:var(--ink);
  margin-bottom:3px;
}
.sd-card-desc{font-size:12px;color:var(--slate-light);margin-bottom:16px}

/* ── TESTS SECTION ── */
.sd-tests-card{
  background:var(--card);
  border-radius:14px;
  border:1px solid var(--sd-border);
  padding:20px 22px;
  margin-bottom:16px;
  animation:sd-fadeUp .4s .22s ease both;
}
.sd-tests-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:16px;
}

.sd-seg{
  display:flex;
  background:var(--paper);
  border:1px solid var(--sd-border);
  border-radius:8px;
  padding:3px;
  gap:2px;
}
.sd-seg-btn{
  padding:5px 13px;
  border-radius:6px;
  font-size:12px;
  cursor:pointer;
  color:var(--slate);
  font-weight:400;
  transition:.12s;
  font-family:'DM Sans',sans-serif;
  border:none;
  background:transparent;
  display:flex;
  align-items:center;
  gap:5px;
}
.sd-seg-btn.on{background:var(--card);color:var(--ink);font-weight:500}
.sd-seg-count{
  font-size:10px;
  background:rgba(26,35,50,0.07);
  color:var(--slate-light);
  padding:1px 6px;
  border-radius:10px;
}
.sd-seg-btn.on .sd-seg-count{
  background:var(--blush-pale);
  color:var(--blush);
}

.sd-test-list{display:flex;flex-direction:column;gap:8px}

.sd-trow{
  display:flex;
  align-items:center;
  gap:14px;
  padding:14px 16px;
  background:var(--paper);
  border-radius:10px;
  border:1px solid transparent;
  cursor:pointer;
  transition:border-color .15s, background .15s;
}
.sd-trow:hover{border-color:rgba(201,125,95,0.25);background:var(--warm)}
.sd-trow.hi{border-left:3px solid var(--sage);padding-left:13px}

.sd-trow-left{flex:1;min-width:0}
.sd-trow-name{font-size:13.5px;font-weight:500;color:var(--ink);margin-bottom:2px}
.sd-trow-meta{font-size:11.5px;color:var(--slate-light)}

.sd-trow-prog{display:flex;flex-direction:column;gap:5px;width:160px;flex-shrink:0}
.sd-trow-prog-top{display:flex;justify-content:space-between}
.sd-trow-prog-top span{font-size:11px;color:var(--slate-light)}
.sd-trow-prog-top strong{font-size:11px;font-weight:600;color:var(--ink)}
.sd-prog-track{height:3px;background:#e5e2dd;border-radius:10px;overflow:hidden}
.sd-prog-fill{height:100%;border-radius:10px}
.sd-pf-lo{background:var(--gold)}
.sd-pf-mid{background:var(--blush)}
.sd-pf-hi{background:var(--sage)}

.sd-tbadge{
  font-size:10.5px;
  font-weight:500;
  padding:3px 9px;
  border-radius:20px;
  flex-shrink:0;
  white-space:nowrap;
}
.sd-tbadge-ip{background:var(--blush-pale);color:var(--blush)}
.sd-tbadge-ns{background:var(--slate-pale);color:var(--slate-light)}
.sd-tbadge-done{background:var(--sage-pale);color:var(--sage)}

.sd-trow-action{flex-shrink:0}
.sd-act-btn{
  padding:6px 14px;
  border-radius:7px;
  font-size:12px;
  font-weight:500;
  cursor:pointer;
  font-family:'DM Sans',sans-serif;
  border:none;
  white-space:nowrap;
}
.sd-act-resume{background:var(--ink);color:white}
.sd-act-start{background:transparent;color:var(--slate);border:1px solid var(--sd-border)}
.sd-act-finish{background:var(--sage);color:white}

.sd-empty-state{
  text-align:center;
  padding:36px 20px;
  color:var(--slate-light);
  font-size:13px;
}

/* ── TRAITS ── */
.sd-trait-list{display:flex;flex-direction:column;gap:12px}
.sd-trait-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
.sd-trait-name{font-size:13px;font-weight:500;color:var(--ink)}
.sd-trait-score{font-size:13px;font-weight:600;color:var(--slate)}
.sd-trait-bar{height:5px;background:#ede9e3;border-radius:99px;overflow:hidden}
.sd-trait-fill{height:100%;border-radius:99px;transition:width .8s cubic-bezier(.25,.8,.25,1)}
.sd-fill-o{background:var(--sage)}
.sd-fill-c{background:var(--gold)}
.sd-fill-e{background:var(--blush)}
.sd-fill-a{background:#8fa8d0}
.sd-fill-n{background:var(--lavender)}

/* ── HISTORY ── */
.sd-history-list{display:flex;flex-direction:column}
.sd-history-item{
  display:flex;align-items:center;gap:12px;
  padding:11px 0;
  border-bottom:1px solid var(--sd-border);
  cursor:pointer;
  transition:padding .12s;
}
.sd-history-item:last-child{border-bottom:none}
.sd-history-item:hover{padding-left:4px}
.sd-history-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.sd-history-info{flex:1;min-width:0}
.sd-history-name{font-size:13px;font-weight:500;color:var(--ink)}
.sd-history-meta{font-size:11px;color:var(--slate-light);margin-top:1px}
.sd-history-score{
  font-family:'DM Serif Display',serif;
  font-size:19px;
  color:var(--ink);
  text-align:right;
}
.sd-history-change{font-size:11px;text-align:right;margin-top:1px}

/* ── WELLBEING ── */
.sd-wellbeing-wrap{display:flex;gap:18px;align-items:center}
.sd-ring-wrap{position:relative;flex-shrink:0}
.sd-ring-label{
  position:absolute;top:50%;left:50%;
  transform:translate(-50%,-50%);
  text-align:center;
}
.sd-ring-pct{
  font-family:'DM Serif Display',serif;
  font-size:20px;color:var(--ink);
  display:block;line-height:1;
}
.sd-ring-sub{font-size:9px;color:var(--slate-light);text-transform:uppercase;letter-spacing:1px}
.sd-dim-list{flex:1;display:flex;flex-direction:column;gap:9px}
.sd-dim-item{display:flex;align-items:center;gap:9px}
.sd-dim-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.sd-dim-name{font-size:12px;color:var(--slate);flex:1}
.sd-dim-bar{width:72px;height:3px;background:#ede9e3;border-radius:99px;overflow:hidden}
.sd-dim-fill{height:100%;border-radius:99px}
.sd-dim-val{font-size:12px;font-weight:600;color:var(--ink);min-width:26px;text-align:right}

/* ── INSIGHT ── */
.sd-insight-card{
  background:var(--card);
  border:1px solid rgba(95,143,114,0.2);
  border-left:3px solid var(--sage);
  border-radius:14px;
  padding:22px 24px;
  margin-bottom:6px;
  display:flex;
  align-items:flex-start;
  gap:18px;
  animation:sd-fadeUp .4s .36s ease both;
}
.sd-insight-icon-wrap{
  width:38px;height:38px;
  border-radius:10px;
  background:var(--sage-pale);
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
  font-size:17px;
}
.sd-insight-body{flex:1}
.sd-insight-label{
  font-size:10px;
  letter-spacing:1.5px;
  text-transform:uppercase;
  color:var(--sage);
  font-weight:600;
  margin-bottom:6px;
}
.sd-insight-title{
  font-family:'DM Serif Display',serif;
  font-size:15px;
  color:var(--ink);
  margin-bottom:8px;
}
.sd-insight-text{font-size:13px;color:var(--slate);line-height:1.7}
.sd-insight-hl{color:var(--blush);font-weight:600}

/* ── SIGNOUT ── */
.sd-signout-btn{
  width:100%;padding:8px;border-radius:8px;margin-top:12px;
  border:1px solid rgba(201,125,95,0.25);background:var(--blush-pale);color:var(--blush);
  font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;
  cursor:pointer;transition:.15s;
}
.sd-signout-btn:hover{background:#f5d8cc;border-color:rgba(201,125,95,0.4)}

/* ── LOADING ── */
.sd-loading{text-align:center;padding:40px 0;color:var(--slate-light);font-size:13px}
.sd-spinner{
  display:inline-block;width:22px;height:22px;border-radius:50%;
  border:2.5px solid var(--sd-border);border-top-color:var(--sage);
  animation:sd-spin .6s linear infinite;margin-bottom:8px;
}
@keyframes sd-spin{to{transform:rotate(360deg)}}

/* ── ANIMATIONS ── */
@keyframes sd-fadeUp{
  from{opacity:0;transform:translateY(12px)}
  to{opacity:1;transform:translateY(0)}
}
.sd-g3 .sd-card:nth-child(1){animation:sd-fadeUp .4s .10s ease both}
.sd-g3 .sd-card:nth-child(2){animation:sd-fadeUp .4s .15s ease both}
.sd-g3 .sd-card:nth-child(3){animation:sd-fadeUp .4s .20s ease both}
.sd-g21>*{animation:sd-fadeUp .4s .28s ease both}
.sd-g2>*{animation:sd-fadeUp .4s .32s ease both}

::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--sd-border);border-radius:99px}

/* ── PROFILE VIEW ── */
.sd-profile-banner{
  background:linear-gradient(135deg,var(--sage) 0%,var(--sage-light) 100%);
  border-radius:16px;padding:32px;display:flex;align-items:center;gap:24px;
  margin-bottom:20px;color:#fff;position:relative;overflow:hidden;
}
.sd-profile-banner::after{
  content:'';position:absolute;right:-40px;top:-40px;width:200px;height:200px;
  border-radius:50%;background:rgba(255,255,255,0.08);pointer-events:none;
}
.sd-profile-avatar-lg{
  width:80px;height:80px;border-radius:50%;
  background:rgba(255,255,255,0.2);border:3px solid rgba(255,255,255,0.3);
  display:flex;align-items:center;justify-content:center;
  font-size:28px;font-weight:700;flex-shrink:0;
}
.sd-profile-name-lg{font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:4px}
.sd-profile-role{font-size:13px;opacity:0.7;text-transform:capitalize}
.sd-profile-stats-row{display:flex;gap:12px;margin-top:12px}
.sd-profile-stat-pill{
  padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;
  background:rgba(255,255,255,0.15);
}

.sd-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:768px){.sd-profile-grid{grid-template-columns:1fr}}

.sd-form-group{margin-bottom:14px}
.sd-form-label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--slate-light);font-weight:600;margin-bottom:5px}
.sd-form-input{
  width:100%;padding:10px 14px;border-radius:10px;
  border:1px solid var(--sd-border);background:var(--paper);
  font-size:13px;font-family:'DM Sans',sans-serif;color:var(--ink);
  outline:none;transition:border-color .15s;
}
.sd-form-input:focus{border-color:var(--sage)}
.sd-form-input:disabled{opacity:0.6;cursor:not-allowed}
.sd-form-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%238898aa' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
.sd-save-btn{
  padding:10px 24px;border-radius:10px;
  background:var(--sage);color:#fff;
  border:none;font-size:13px;font-weight:600;
  font-family:'DM Sans',sans-serif;cursor:pointer;
  transition:background .15s;
}
.sd-save-btn:hover{background:#4e7e62}
.sd-save-btn:disabled{opacity:0.6;cursor:not-allowed}

.sd-success-msg{
  padding:10px 16px;border-radius:10px;
  background:var(--sage-pale);color:var(--sage);
  font-size:13px;font-weight:500;margin-bottom:14px;
  display:flex;align-items:center;gap:8px;
}

/* ── ASSESSMENTS VIEW ── */
.sd-assess-tabs{display:flex;gap:6px;margin-bottom:16px}
.sd-assess-tab{
  padding:8px 18px;border-radius:20px;font-size:12px;font-weight:600;
  cursor:pointer;border:1.5px solid var(--sd-border);background:var(--card);
  color:var(--slate);font-family:'DM Sans',sans-serif;transition:all .15s;
  display:flex;align-items:center;gap:6px;
}
.sd-assess-tab:hover{border-color:var(--sage);color:var(--sage)}
.sd-assess-tab.on{background:var(--sage);color:#fff;border-color:var(--sage)}
.sd-assess-count{
  font-size:10px;padding:1px 7px;border-radius:10px;
  background:rgba(0,0,0,0.1);
}
.sd-assess-tab.on .sd-assess-count{background:rgba(255,255,255,0.25)}

.sd-completed-card{
  display:flex;align-items:center;gap:14px;
  padding:14px 18px;background:var(--card);
  border:1px solid var(--sd-border);border-radius:12px;
  margin-bottom:8px;transition:all .15s;cursor:pointer;
}
.sd-completed-card:hover{border-color:rgba(95,143,114,0.3);box-shadow:0 2px 12px rgba(26,35,50,0.05)}
.sd-completed-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}
.sd-completed-info{flex:1;min-width:0}
.sd-completed-name{font-size:13.5px;font-weight:500;color:var(--ink);margin-bottom:2px}
.sd-completed-meta{font-size:11.5px;color:var(--slate-light)}
.sd-completed-score{font-family:'DM Serif Display',serif;font-size:22px;color:var(--ink);text-align:right}
.sd-completed-badge{font-size:10px;font-weight:500;padding:3px 10px;border-radius:20px;flex-shrink:0}

/* ── GRIEVANCE VIEW ── */
.sd-grievance-card{background:var(--card);border:1px solid var(--sd-border);border-radius:14px;padding:20px 22px;margin-bottom:14px}
.sd-grievance-form{display:flex;flex-direction:column;gap:12px}
.sd-grievance-textarea{
  width:100%;padding:12px 14px;border-radius:10px;
  border:1px solid var(--sd-border);background:var(--paper);
  font-size:13px;font-family:'DM Sans',sans-serif;color:var(--ink);
  outline:none;transition:border-color .15s;resize:vertical;min-height:120px;
}
.sd-grievance-textarea:focus{border-color:var(--sage)}
.sd-grievance-list{display:flex;flex-direction:column;gap:10px}
.sd-grievance-item{
  background:var(--paper);border:1px solid var(--sd-border);
  border-radius:10px;padding:14px 16px;
}
.sd-grievance-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px}
.sd-grievance-subj{font-size:13.5px;font-weight:500;color:var(--ink)}
.sd-grievance-desc{font-size:12px;color:var(--slate);line-height:1.6;margin-top:4px}
.sd-grievance-meta{font-size:11px;color:var(--slate-light);margin-top:6px}
.sd-grievance-reply{
  margin-top:10px;padding:10px 14px;background:var(--sage-pale);
  border-left:3px solid var(--sage);border-radius:8px;
  font-size:12px;color:var(--sage);line-height:1.6;
}
.sd-grievance-reply strong{color:var(--ink);font-weight:600;display:block;margin-bottom:3px;font-size:11px;text-transform:uppercase;letter-spacing:1px}
.sd-status-badge{font-size:10px;font-weight:500;padding:3px 9px;border-radius:20px;flex-shrink:0;text-transform:capitalize}
.sd-status-open{background:var(--gold-pale);color:var(--gold)}
.sd-status-in_progress{background:var(--blush-pale);color:var(--blush)}
.sd-status-resolved{background:var(--sage-pale);color:var(--sage)}
.sd-status-closed{background:var(--slate-pale);color:var(--slate-light)}

/* ── REPORTS VIEW ── */
.sd-reports-header{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:20px;
}
.sd-reports-header h2{
  font-family:'DM Serif Display',serif;
  font-size:22px;color:var(--ink);
}
.sd-reports-header p{font-size:13px;color:var(--slate-light);margin-top:2px}

.sd-report-list{display:flex;flex-direction:column;gap:10px}

.sd-report-row{
  display:flex;align-items:center;gap:16px;
  padding:16px 20px;
  background:var(--card);
  border:1px solid var(--sd-border);
  border-radius:14px;
  transition:border-color .15s,box-shadow .15s;
  cursor:pointer;
}
.sd-report-row:hover{
  border-color:rgba(95,143,114,0.25);
  box-shadow:0 4px 16px rgba(26,35,50,0.06);
}

.sd-report-icon{
  width:42px;height:42px;border-radius:11px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;font-size:18px;
}
.sd-report-info{flex:1;min-width:0}
.sd-report-title{font-size:14px;font-weight:500;color:var(--ink);margin-bottom:2px}
.sd-report-meta{font-size:12px;color:var(--slate-light)}

.sd-report-score{
  font-family:'DM Serif Display',serif;
  font-size:24px;color:var(--ink);
  text-align:right;min-width:50px;
}
.sd-report-score-lbl{font-size:10px;color:var(--slate-light);text-align:right;margin-top:1px}

.sd-report-actions{display:flex;gap:6px;flex-shrink:0}
.sd-report-act{
  padding:6px 14px;border-radius:8px;
  font-size:12px;font-weight:500;
  cursor:pointer;border:none;
  font-family:'DM Sans',sans-serif;
  transition:all .15s;
  display:flex;align-items:center;gap:5px;
}
.sd-act-view{background:var(--sage-pale);color:var(--sage)}
.sd-act-view:hover{background:var(--sage);color:white}
.sd-act-download{background:var(--paper);color:var(--slate);border:1px solid var(--sd-border)}
.sd-act-download:hover{background:var(--slate-pale)}

/* ── Responsive ── */
@media(max-width:768px){
  .sd-sidebar{display:none}
  .sd-main{margin-left:0}
  .sd-g3{grid-template-columns:1fr}
  .sd-g21{grid-template-columns:1fr}
  .sd-g2{grid-template-columns:1fr}
  .sd-trow{flex-wrap:wrap}
  .sd-trow-prog{width:100%}
  .sd-banner{flex-direction:column;text-align:center;gap:16px}
  .sd-banner-right{text-align:center}
}
`;

/* ─── Helpers ─── */
function getProgress(s) {
  const bi = s.battery_info || {};
  const answered = bi.answeredCount ?? s.answered_count ?? s.current_item_index ?? 0;
  const total    = bi.totalItems ?? s.total_items ?? s.item_count ?? 0;
  return { answered, total, pct: total > 0 ? Math.round((answered / total) * 100) : 0 };
}
function thetaToPct(theta) {
  return Math.max(5, Math.min(95, Math.round(((theta + 3) / 6) * 100)));
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
/* ═══ PROFILE VIEW COMPONENT ═══ */
function ProfileView({ user, initials, roleLabel, completed, pending, reports, avgScore, logout, navigate }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    parent_name: user?.parent_name || '',
    parent_phone: user?.parent_phone || '',
    date_of_birth: user?.date_of_birth ? user.date_of_birth.split('T')[0] : '',
    gender: user?.gender || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await api.put('/auth/me', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { alert(err.message || 'Failed to update profile'); }
    setSaving(false);
  };

  const Field = ({ label, field, type = 'text', disabled, options }) => (
    <div className="sd-form-group">
      <div className="sd-form-label">{label}</div>
      {options ? (
        <select className="sd-form-input sd-form-select" value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} disabled={disabled}>
          <option value="">—</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input className="sd-form-input" type={type} value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} disabled={disabled} />
      )}
    </div>
  );

  return (
    <>
      {/* Banner */}
      <div className="sd-profile-banner">
        <div className="sd-profile-avatar-lg">{initials}</div>
        <div style={{ zIndex: 1 }}>
          <div className="sd-profile-name-lg">{user?.first_name} {user?.last_name}</div>
          <div className="sd-profile-role">{roleLabel || 'Student'} · {user?.grade || ''} {user?.section || ''}</div>
          <div className="sd-profile-stats-row">
            <span className="sd-profile-stat-pill">{completed.length} Completed</span>
            <span className="sd-profile-stat-pill">{pending.length} Pending</span>
            <span className="sd-profile-stat-pill">{reports.length} Reports</span>
            {avgScore > 0 && <span className="sd-profile-stat-pill">Avg: {avgScore}%</span>}
          </div>
        </div>
      </div>

      {saved && <div className="sd-success-msg">Profile updated successfully</div>}

      <div className="sd-profile-grid">
        {/* Personal Info */}
        <div className="sd-card">
          <div className="sd-card-title" style={{ marginBottom: 16 }}>Personal Information</div>
          <Field label="First Name" field="first_name" />
          <Field label="Last Name" field="last_name" />
          <Field label="Email" field="email" disabled />
          <div className="sd-form-group">
            <div className="sd-form-label">Email</div>
            <input className="sd-form-input" value={user?.email || '—'} disabled />
          </div>
          <Field label="Date of Birth" field="date_of_birth" type="date" />
          <Field label="Gender" field="gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
        </div>

        {/* Contact & Academic */}
        <div className="sd-card">
          <div className="sd-card-title" style={{ marginBottom: 16 }}>Contact & Academic</div>
          <Field label="Phone" field="phone" />
          <Field label="Parent / Guardian Name" field="parent_name" />
          <Field label="Parent Phone" field="parent_phone" />
          <div className="sd-form-group">
            <div className="sd-form-label">Grade</div>
            <input className="sd-form-input" value={user?.grade || '—'} disabled />
          </div>
          <div className="sd-form-group">
            <div className="sd-form-label">Section</div>
            <input className="sd-form-input" value={user?.section || '—'} disabled />
          </div>
          <div className="sd-form-group">
            <div className="sd-form-label">Age Band</div>
            <input className="sd-form-input" value={user?.age_band || '—'} disabled />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="sd-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button className="sd-signout-btn" style={{ width: 'auto', padding: '10px 24px', marginTop: 0 }} onClick={() => { logout(); navigate('/login'); }}>
          Sign Out
        </button>
      </div>
    </>
  );
}

/* ═══ ASSESSMENTS VIEW COMPONENT ═══ */
function AssessmentsView({ sessions, completed, inProgress, assigned, reports, navigate }) {
  const [tab, setTab] = useState('all');

  const filteredSessions = tab === 'all' ? sessions
    : tab === 'completed' ? sessions.filter(s => s.status === 'completed')
    : tab === 'in_progress' ? inProgress
    : assigned;

  const iconBgs = { aptitude: 'var(--sage-pale)', personality: 'var(--blush-pale)', interest: 'var(--gold-pale)', default: 'var(--sage-pale)' };
  const statusBadge = (status) => {
    if (status === 'completed') return { cls: 'sd-tbadge-done', label: 'Completed' };
    if (status === 'in_progress') return { cls: 'sd-tbadge-ip', label: 'In Progress' };
    return { cls: 'sd-tbadge-ns', label: 'Not Started' };
  };

  return (
    <>
      <div className="sd-reports-header">
        <div>
          <h2>All Assessments</h2>
          <p>{sessions.length} total · {completed.length} completed · {inProgress.length} in progress · {assigned.length} not started</p>
        </div>
      </div>

      <div className="sd-assess-tabs">
        {[
          { id: 'all', label: 'All', count: sessions.length },
          { id: 'completed', label: 'Completed', count: completed.length },
          { id: 'in_progress', label: 'In Progress', count: inProgress.length },
          { id: 'assigned', label: 'Not Started', count: assigned.length },
        ].map(t => (
          <button key={t.id} className={`sd-assess-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label} <span className="sd-assess-count">{t.count}</span>
          </button>
        ))}
      </div>

      {filteredSessions.length === 0 ? (
        <div className="sd-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>No assessments here</div>
          <div style={{ fontSize: 13, color: 'var(--slate-light)', marginTop: 4 }}>
            {tab === 'completed' ? 'Complete a test to see it here.' : tab === 'in_progress' ? 'No tests in progress.' : tab === 'assigned' ? 'All tests have been started.' : 'No assessments assigned yet.'}
          </div>
        </div>
      ) : (
        filteredSessions.map(s => {
          const type = s.battery_type || s.type || 'default';
          const bm = BAT[type] || BAT.default;
          const { pct } = getProgress(s);
          const badge = statusBadge(s.status);
          const report = reports.find(r => r.session_id === s.id);
          const bi = s.battery_info || {};
          const date = s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

          return (
            <div key={s.id} className="sd-completed-card" onClick={() => {
              if (s.status === 'completed' && report) navigate(`/student/reports/${report.id}`);
              else if (s.status !== 'completed') navigate(`/test/${s.id}`);
            }}>
              <div className="sd-completed-icon" style={{ background: iconBgs[type] || iconBgs.default }}>
                {bm.icon}
              </div>
              <div className="sd-completed-info">
                <div className="sd-completed-name">{s.battery_name || bm.label}</div>
                <div className="sd-completed-meta">
                  {date}
                  {bi.sectionCount ? ` · ${bi.sectionCount} sections` : ''}
                  {pct > 0 && s.status !== 'completed' ? ` · ${pct}% done` : ''}
                </div>
              </div>
              <span className={`sd-completed-badge ${badge.cls}`}>{badge.label}</span>
              {s.status === 'completed' && report && (
                <button className="sd-report-act sd-act-view" onClick={e => { e.stopPropagation(); navigate(`/student/reports/${report.id}`); }}>
                  View Report
                </button>
              )}
              {s.status === 'completed' && !report && (
                <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 500 }}>Report pending</span>
              )}
              {s.status !== 'completed' && (
                <button className="sd-report-act sd-act-view" onClick={e => { e.stopPropagation(); navigate(`/test/${s.id}`); }}>
                  {s.status === 'in_progress' ? 'Resume' : 'Start'}
                </button>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

/* ═══ GRIEVANCE VIEW COMPONENT ═══ */
function GrievanceView() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'general', subject: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/grievances').then(d => setGrievances(d.grievances || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.subject.trim() || !form.description.trim()) return alert('Please fill in subject and description');
    setSubmitting(true);
    try {
      await api.post('/grievances', form);
      setForm({ category: 'general', subject: '', description: '' });
      setShowForm(false);
      load();
    } catch (err) { alert(err.message || 'Failed to submit'); }
    setSubmitting(false);
  };

  return (
    <>
      <div className="sd-reports-header">
        <div>
          <h2>Help & Grievance</h2>
          <p>Have a question or facing an issue? We're here to help.</p>
        </div>
        {!showForm && (
          <button className="sd-save-btn" onClick={() => setShowForm(true)}>+ New Query</button>
        )}
      </div>

      {showForm && (
        <div className="sd-grievance-card">
          <div className="sd-card-title" style={{ marginBottom: 12 }}>Submit a Query</div>
          <div className="sd-grievance-form">
            <div className="sd-form-group">
              <div className="sd-form-label">Category</div>
              <select className="sd-form-input sd-form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="general">General Query</option>
                <option value="technical">Technical Issue</option>
                <option value="test_issue">Test/Assessment Issue</option>
                <option value="report_issue">Report Issue</option>
                <option value="account">Account Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sd-form-group">
              <div className="sd-form-label">Subject</div>
              <input className="sd-form-input" placeholder="Brief description of your issue" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="sd-form-group">
              <div className="sd-form-label">Description</div>
              <textarea className="sd-grievance-textarea" placeholder="Tell us more about your issue or question..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="sd-save-btn" onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Query'}
              </button>
              <button className="sd-btn sd-btn-ghost" onClick={() => { setShowForm(false); setForm({ category: 'general', subject: '', description: '' }); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div className="sd-card-title" style={{ marginBottom: 12 }}>Your Queries</div>
        {loading ? (
          <div className="sd-loading"><div className="sd-spinner" /><div>Loading queries...</div></div>
        ) : grievances.length === 0 ? (
          <div className="sd-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>No queries yet</div>
            <div style={{ fontSize: 13, color: 'var(--slate-light)', marginTop: 4 }}>Submit a query above if you need help.</div>
          </div>
        ) : (
          <div className="sd-grievance-list">
            {grievances.map(g => (
              <div key={g.id} className="sd-grievance-item">
                <div className="sd-grievance-top">
                  <div style={{ flex: 1 }}>
                    <div className="sd-grievance-subj">{g.subject}</div>
                    <div className="sd-grievance-desc">{g.description}</div>
                  </div>
                  <span className={`sd-status-badge sd-status-${g.status}`}>{g.status.replace('_', ' ')}</span>
                </div>
                <div className="sd-grievance-meta">
                  {g.category.replace('_', ' ')} · {new Date(g.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {g.admin_reply && (
                  <div className="sd-grievance-reply">
                    <strong>Admin Response</strong>
                    {g.admin_reply}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [testTab, setTestTab] = useState('ip');
  const [sessions, setSessions] = useState([]);
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');

  /* Inject CSS once */
  useEffect(() => {
    if (!document.getElementById('sd-css')) {
      const el = document.createElement('style');
      el.id = 'sd-css'; el.textContent = CSS;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([
      api.get('/sessions?mine=true'),
      api.get('/reports?limit=30'),
    ]).then(([sR, rR]) => {
      if (sR.status === 'fulfilled') setSessions(sR.value.sessions || []);
      if (rR.status === 'fulfilled') setReports(rR.value.reports || rR.value || []);
    }).finally(() => setLoading(false));
  }, []);

  /* Derived */
  const inProgress = sessions.filter(s => s.status === 'in_progress');
  const assigned   = sessions.filter(s => s.status === 'assigned');
  const completed  = sessions.filter(s => s.status === 'completed');
  const pending    = sessions.filter(s => ['assigned', 'in_progress'].includes(s.status));
  const firstName  = user?.first_name || 'Student';
  const initials   = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';
  const roleLabel  = (user?.role || '').replace(/_/g, ' ');

  /* Greeting */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* Avg score */
  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => {
        const s = r.report_data?.summary?.overallScore ?? r.report_data?.summary?.bestMatch ?? 0;
        return sum + s;
      }, 0) / reports.length)
    : 0;

  /* Tests for tabs */
  const ipTests = inProgress.map(s => {
    const { answered, total, pct } = getProgress(s);
    const bi = s.battery_info || {};
    const type = s.battery_type || s.type || 'default';
    const bm = BAT[type] || BAT.default;
    const estMin = bi.estimatedMinutes;
    const secCount = bi.sectionCount;
    const meta = [secCount ? `${secCount} sections` : null, estMin ? `${estMin} min` : null].filter(Boolean).join(' · ');
    const almost = pct >= 80;
    return { id: s.id, name: s.battery_name || bm.label, meta, answered, total, pct, almost, state: almost ? 'finish' : 'resume' };
  });

  const nsTests = assigned.map(s => {
    const bi = s.battery_info || {};
    const type = s.battery_type || s.type || 'default';
    const bm = BAT[type] || BAT.default;
    const total = bi.totalItems ?? s.total_items ?? s.item_count ?? 0;
    const estMin = bi.estimatedMinutes;
    const secCount = bi.sectionCount;
    const meta = [secCount ? `${secCount} sections` : null, estMin ? `${estMin} min` : null].filter(Boolean).join(' · ');
    return { id: s.id, name: s.battery_name || bm.label, meta, answered: 0, total, pct: 0, almost: false, state: 'start', time: estMin ? `${estMin} min to complete` : 'Ready to start' };
  });

  const activeTests = testTab === 'ip' ? ipTests : nsTests;

  /* Recent completed for history */
  const recentCompleted = reports.slice(0, 4).map(r => {
    const type = r.report_type || 'default';
    const bm = BAT[type] || BAT.default;
    const data = r.report_data || {};
    const score = data.summary?.overallScore ?? data.summary?.bestMatch ?? 0;
    const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const colors = ['var(--sage)', 'var(--gold)', 'var(--blush)', '#8fa8d0'];
    return { id: r.id, name: bm.label, date, score, color: colors[reports.indexOf(r) % 4] };
  });

  /* Big Five from personality report */
  const persReport = reports.find(r => r.report_type === 'personality');
  const bigFive = persReport?.report_data?.domainReports
    ? persReport.report_data.domainReports.slice(0, 5).map((d, i) => {
        const names = ['Openness to experience', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
        const fills = ['sd-fill-o', 'sd-fill-c', 'sd-fill-e', 'sd-fill-a', 'sd-fill-n'];
        const score = thetaToPct(d.theta ?? 0);
        return { name: names[i] || d.domain, score, fill: fills[i] };
      })
    : [
        { name: 'Openness to experience', score: 82, fill: 'sd-fill-o' },
        { name: 'Conscientiousness', score: 76, fill: 'sd-fill-c' },
        { name: 'Extraversion', score: 54, fill: 'sd-fill-e' },
        { name: 'Agreeableness', score: 69, fill: 'sd-fill-a' },
        { name: 'Neuroticism', score: 31, fill: 'sd-fill-n' },
      ];

  /* Progress fill class */
  function pfClass(pct, state) {
    if (state === 'finish') return 'sd-pf-hi';
    if (pct < 20) return 'sd-pf-lo';
    return 'sd-pf-mid';
  }

  return (
    <div className="sd">
      {/* SIDEBAR */}
      <aside className="sd-sidebar">
        <div className="sd-sidebar-logo">
          <div className="sd-logo-mark">Cogni<span>Map</span></div>
          <div className="sd-logo-sub">Assessment Platform</div>
        </div>

        <div className="sd-nav-section">
          <div className="sd-nav-label">Overview</div>
          <button className={`sd-nav-item${activeNav === 'dashboard' ? ' active' : ''}`} onClick={() => setActiveNav('dashboard')}>
            <svg className="sd-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
            </svg>Dashboard
          </button>
          <button className={`sd-nav-item${activeNav === 'profile' ? ' active' : ''}`} onClick={() => setActiveNav('profile')}>
            <svg className="sd-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
            </svg>My Profile
          </button>
          <button className={`sd-nav-item${activeNav === 'assessments' ? ' active' : ''}`} onClick={() => setActiveNav('assessments')}>
            <svg className="sd-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M13 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z"/>
              <path d="M5 7h6M5 10h4"/>
            </svg>Assessments
          </button>
        </div>

        <div className="sd-nav-section">
          <div className="sd-nav-label">Analytics</div>
          <button className={`sd-nav-item${activeNav === 'reports' ? ' active' : ''}`} onClick={() => setActiveNav('reports')}>
            <svg className="sd-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 4h12M4 8h8M6 12h4"/>
            </svg>Reports
          </button>
        </div>

        <div className="sd-nav-section">
          <div className="sd-nav-label">Support</div>
          <button className={`sd-nav-item${activeNav === 'grievance' ? ' active' : ''}`} onClick={() => setActiveNav('grievance')}>
            <svg className="sd-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M14 10c0 .6-.4 1-1 1H5l-3 3V3c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v7z"/>
            </svg>Help & Grievance
          </button>
        </div>

        <div className="sd-sidebar-footer">
          <div className="sd-user-card">
            <div className="sd-user-avatar">{initials}</div>
            <div>
              <div className="sd-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sd-user-role" style={{ textTransform: 'capitalize' }}>{roleLabel || 'Student'}</div>
            </div>
          </div>
          <button className="sd-signout-btn" onClick={() => { logout(); navigate('/login'); }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="sd-main">
        <div className="sd-topbar">
          <div className="sd-topbar-left">
            <h1>{greeting}, {firstName}</h1>
            <p>{today} · Your weekly snapshot is ready</p>
          </div>
          <div className="sd-topbar-right">
            <div className="sd-notif-btn">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#4a5568" strokeWidth="1.6">
                <path d="M8 1a5 5 0 0 1 5 5v2.5l1 1.5H2l1-1.5V6a5 5 0 0 1 5-5z"/>
                <path d="M6 13a2 2 0 0 0 4 0"/>
              </svg>
              {pending.length > 0 && <div className="sd-notif-pip" />}
            </div>
            <button className="sd-btn sd-btn-ghost">Export report</button>
            <button className="sd-btn sd-btn-primary" onClick={() => setActiveNav('assessments')}>+ New assessment</button>
          </div>
        </div>

        <div className="sd-content">
          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <div>Loading your dashboard...</div>
            </div>
          ) : activeNav === 'reports' ? (
            /* ═══ REPORTS VIEW ═══ */
            <>
              <div className="sd-reports-header">
                <div>
                  <h2>Your Reports</h2>
                  <p>{reports.length} report{reports.length !== 1 ? 's' : ''} available</p>
                </div>
              </div>
              {/* Completed tests awaiting report */}
              {completed.length > 0 && reports.length === 0 && (
                <div className="sd-card" style={{ background: 'var(--gold-pale)', border: '1px solid rgba(201,150,62,0.2)', borderLeft: '3px solid var(--gold)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 22 }}>⏳</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Report being prepared</div>
                      <div style={{ fontSize: 12, color: 'var(--slate-light)', marginTop: 2 }}>
                        You've completed {completed.length} assessment{completed.length !== 1 ? 's' : ''}. Your report will appear here once released by your counsellor.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {reports.length === 0 && completed.length === 0 ? (
                <div className="sd-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>No reports yet</div>
                  <div style={{ fontSize: 13, color: 'var(--slate-light)' }}>Complete an assessment to see your reports here.</div>
                  <button className="sd-btn sd-btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveNav('dashboard')}>Go to Dashboard</button>
                </div>
              ) : (
                <div className="sd-report-list">
                  {reports.map((r, i) => {
                    const type = r.report_type || 'default';
                    const bm = BAT[type] || BAT.default;
                    const data = r.report_data || {};
                    const score = data.summary?.overallScore ?? data.summary?.bestMatch ?? 0;
                    const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    const iconBgs = { aptitude: 'var(--sage-pale)', personality: 'var(--blush-pale)', interest: 'var(--gold-pale)' };
                    return (
                      <div key={r.id} className="sd-report-row" onClick={() => navigate(`/student/reports/${r.id}`)}>
                        <div className="sd-report-icon" style={{ background: iconBgs[type] || 'var(--sage-pale)' }}>
                          {bm.icon}
                        </div>
                        <div className="sd-report-info">
                          <div className="sd-report-title">{bm.label}</div>
                          <div className="sd-report-meta">{date} · {r.report_type || 'Assessment'} report{r.status === 'published' ? ' · Published' : ''}</div>
                        </div>
                        {score > 0 && (
                          <div>
                            <div className="sd-report-score">{score}<span style={{ fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 400 }}>%</span></div>
                            <div className="sd-report-score-lbl">Score</div>
                          </div>
                        )}
                        <div className="sd-report-actions">
                          <button className="sd-report-act sd-act-view" onClick={e => { e.stopPropagation(); navigate(`/student/reports/${r.id}`); }}>
                            View
                          </button>
                          <button className="sd-report-act sd-act-download" onClick={e => {
                            e.stopPropagation();
                            const w = window.open(`/student/reports/${r.id}`, '_blank');
                            if (w) setTimeout(() => w.print(), 1000);
                          }}>
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : activeNav === 'profile' ? (
            /* ═══ PROFILE VIEW ═══ */
            <ProfileView user={user} initials={initials} roleLabel={roleLabel} completed={completed} pending={pending} reports={reports} avgScore={avgScore} logout={logout} navigate={navigate} />
          ) : activeNav === 'assessments' ? (
            /* ═══ ASSESSMENTS VIEW ═══ */
            <AssessmentsView sessions={sessions} completed={completed} inProgress={inProgress} assigned={assigned} reports={reports} navigate={navigate} />
          ) : activeNav === 'grievance' ? (
            /* ═══ GRIEVANCE VIEW ═══ */
            <GrievanceView />
          ) : (
            <>
              {/* BANNER */}
              <div className="sd-banner">
                <div className="sd-banner-accent" />
                <div className="sd-banner-left">
                  <div className="sd-banner-eyebrow">Your assessment snapshot</div>
                  <div className="sd-banner-headline">
                    {completed.length > 0
                      ? <>You've completed <em>{completed.length} assessment{completed.length !== 1 ? 's' : ''}</em> — keep the momentum.</>
                      : <>Welcome to <em>CogniMap</em> — let's get started.</>
                    }
                  </div>
                  <div className="sd-banner-tags">
                    {completed.length > 0 && (
                      <span className="sd-banner-tag sd-tag-sage">Completed: {completed.length}</span>
                    )}
                    {inProgress.length > 0 && (
                      <span className="sd-banner-tag sd-tag-blush">In Progress: {inProgress.length}</span>
                    )}
                    {assigned.length > 0 && (
                      <span className="sd-banner-tag sd-tag-gold">Assigned: {assigned.length}</span>
                    )}
                  </div>
                </div>
                <div className="sd-banner-right">
                  <div className="sd-banner-score-label">Avg. Score</div>
                  <div className="sd-banner-score">{avgScore || '—'}<sup>{avgScore ? '%' : ''}</sup></div>
                  {reports.length > 0 && (
                    <div className="sd-banner-score-sub">{reports.length} report{reports.length !== 1 ? 's' : ''} generated</div>
                  )}
                </div>
              </div>

              {/* KPI STRIP */}
              <div className="sd-g3">
                <div className="sd-card">
                  <div className="sd-card-icon sd-icon-sage">&#x1f9e0;</div>
                  <div className="sd-card-label">Assessments taken</div>
                  <div className="sd-card-value">{completed.length + inProgress.length}</div>
                  <div className="sd-card-sub"><span className="sd-delta-up">{inProgress.length > 0 ? `${inProgress.length} in progress` : 'All caught up'}</span></div>
                  <div className="sd-mini-bars">
                    {[40,55,45,70,60,80,100].map((h, i) => (
                      <div key={i} className="sd-mini-bar" style={{ height: `${h}%`, background: i >= 5 ? 'var(--sage)' : 'var(--sage-light)' }} />
                    ))}
                  </div>
                </div>
                <div className="sd-card">
                  <div className="sd-card-icon sd-icon-blush">&#x1f3af;</div>
                  <div className="sd-card-label">Tests pending</div>
                  <div className="sd-card-value">{pending.length}</div>
                  <div className="sd-card-sub"><span className="sd-delta-up">{assigned.length} not started</span></div>
                  <div className="sd-mini-bars">
                    {[100,100,100,80,60,40,20].map((h, i) => (
                      <div key={i} className="sd-mini-bar" style={{ height: `${h}%`, background: i <= 2 ? 'var(--blush)' : 'var(--blush-light)' }} />
                    ))}
                  </div>
                </div>
                <div className="sd-card">
                  <div className="sd-card-icon sd-icon-gold">&#x1f4ca;</div>
                  <div className="sd-card-label">Avg. score trend</div>
                  <div className="sd-card-value">{avgScore > 0 ? avgScore : '—'} <span style={{ fontSize: 14, color: 'var(--slate-light)', fontFamily: "'DM Sans',sans-serif", fontWeight: 400 }}>{avgScore > 0 ? 'pts' : ''}</span></div>
                  <div className="sd-card-sub">across all assessments</div>
                  <div className="sd-mini-bars">
                    {[30,40,50,45,65,80,95].map((h, i) => (
                      <div key={i} className="sd-mini-bar" style={{ height: `${h}%`, background: i >= 5 ? 'var(--gold)' : '#e8d9a0' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* ACTIVE TESTS */}
              <div className="sd-tests-card">
                <div className="sd-tests-header">
                  <div>
                    <div className="sd-card-title" style={{ fontSize: 15, marginBottom: 1 }}>Your assessments</div>
                    <div className="sd-card-desc" style={{ marginBottom: 0 }}>Pick up where you left off</div>
                  </div>
                  <div className="sd-seg">
                    <button className={`sd-seg-btn${testTab === 'ip' ? ' on' : ''}`} onClick={() => setTestTab('ip')}>
                      In progress <span className="sd-seg-count">{ipTests.length}</span>
                    </button>
                    <button className={`sd-seg-btn${testTab === 'ns' ? ' on' : ''}`} onClick={() => setTestTab('ns')}>
                      Not started <span className="sd-seg-count">{nsTests.length}</span>
                    </button>
                  </div>
                </div>
                <div className="sd-test-list">
                  {activeTests.length === 0 ? (
                    <div className="sd-empty-state">
                      {testTab === 'ip' ? 'No tests in progress.' : 'No tests waiting to start.'}
                    </div>
                  ) : (
                    activeTests.map(t => (
                      <div
                        key={t.id}
                        className={`sd-trow${t.state === 'finish' ? ' hi' : ''}`}
                        onClick={() => navigate(`/test/${t.id}`)}
                      >
                        <div className="sd-trow-left">
                          <div className="sd-trow-name">{t.name}</div>
                          <div className="sd-trow-meta">
                            {t.meta}{t.pct > 0 ? ` · ${t.answered}/${t.total} done` : ''}
                          </div>
                        </div>
                        {t.pct > 0 ? (
                          <div className="sd-trow-prog">
                            <div className="sd-trow-prog-top">
                              <span>{t.total - t.answered} questions left</span>
                              <strong>{t.pct}%</strong>
                            </div>
                            <div className="sd-prog-track">
                              <div className={`sd-prog-fill ${pfClass(t.pct, t.state)}`} style={{ width: `${t.pct}%` }} />
                            </div>
                          </div>
                        ) : (
                          <div className="sd-trow-prog">
                            <span style={{ fontSize: 12, color: 'var(--slate-light)' }}>{t.time || 'Ready to start'}</span>
                          </div>
                        )}
                        <span className={`sd-tbadge ${t.state === 'finish' ? 'sd-tbadge-done' : t.state === 'start' ? 'sd-tbadge-ns' : 'sd-tbadge-ip'}`}>
                          {t.state === 'finish' ? 'Almost done' : t.state === 'start' ? 'Not started' : 'In progress'}
                        </span>
                        <div className="sd-trow-action">
                          <button
                            className={`sd-act-btn ${t.state === 'finish' ? 'sd-act-finish' : t.state === 'start' ? 'sd-act-start' : 'sd-act-resume'}`}
                            onClick={e => { e.stopPropagation(); navigate(`/test/${t.id}`); }}
                          >
                            {t.state === 'finish' ? 'Finish' : t.state === 'start' ? 'Start' : 'Resume'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* BIG 5 + HISTORY */}
              <div className="sd-g21">
                <div className="sd-card">
                  <div className="sd-card-title">Big Five personality profile</div>
                  <div className="sd-card-desc">Based on your assessments · OCEAN model</div>
                  <div className="sd-trait-list">
                    {bigFive.map(t => (
                      <div key={t.name} className="sd-trait-item">
                        <div className="sd-trait-header">
                          <span className="sd-trait-name">{t.name}</span>
                          <span className="sd-trait-score">{t.score}</span>
                        </div>
                        <div className="sd-trait-bar">
                          <div className={`sd-trait-fill ${t.fill}`} style={{ width: `${t.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sd-card">
                  <div className="sd-card-title">Recent assessments</div>
                  <div className="sd-card-desc">Your last completed tests</div>
                  <div className="sd-history-list">
                    {recentCompleted.length === 0 ? (
                      <div className="sd-empty-state">No completed tests yet.</div>
                    ) : (
                      recentCompleted.map(h => (
                        <div key={h.id} className="sd-history-item" onClick={() => navigate(`/student/reports/${h.id}`)}>
                          <div className="sd-history-dot" style={{ background: h.color }} />
                          <div className="sd-history-info">
                            <div className="sd-history-name">{h.name}</div>
                            <div className="sd-history-meta">{h.date}</div>
                          </div>
                          <div>
                            <div className="sd-history-score">{h.score || '—'}</div>
                            {h.score > 0 && (
                              <div className="sd-history-change sd-delta-up">Score</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* WELLBEING + INSIGHT */}
              <div className="sd-g2">
                <div className="sd-card">
                  <div className="sd-card-title">Assessment dimensions</div>
                  <div className="sd-card-desc">Overview of your performance areas</div>
                  <div className="sd-wellbeing-wrap">
                    <div className="sd-ring-wrap">
                      <svg width="96" height="96" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#ede9e3" strokeWidth="7"/>
                        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--sage)" strokeWidth="7"
                          strokeDasharray="251.2" strokeDashoffset={avgScore > 0 ? 251.2 - (avgScore / 100) * 251.2 : 251.2 * 0.22}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"/>
                      </svg>
                      <div className="sd-ring-label">
                        <span className="sd-ring-pct">{avgScore || '—'}</span>
                        <span className="sd-ring-sub">Overall</span>
                      </div>
                    </div>
                    <div className="sd-dim-list">
                      {[
                        { name: 'Cognitive ability', color: 'var(--blush)', fill: 'var(--blush-light)', val: 82 },
                        { name: 'Problem solving', color: 'var(--sage)', fill: 'var(--sage-light)', val: 75 },
                        { name: 'Critical thinking', color: '#8fa8d0', fill: '#b0c4e0', val: 68 },
                        { name: 'Reasoning', color: 'var(--gold)', fill: '#e8d070', val: 80 },
                        { name: 'Comprehension', color: 'var(--lavender)', fill: '#c4bce0', val: 72 },
                      ].map(d => (
                        <div key={d.name} className="sd-dim-item">
                          <div className="sd-dim-dot" style={{ background: d.color }} />
                          <div className="sd-dim-name">{d.name}</div>
                          <div className="sd-dim-bar"><div className="sd-dim-fill" style={{ width: `${d.val}%`, background: d.fill }} /></div>
                          <div className="sd-dim-val">{d.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sd-card">
                  <div className="sd-card-title">Personalised insight</div>
                  <div className="sd-card-desc">Based on your assessments</div>
                  <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.75 }}>
                    {reports.length > 0 ? (
                      <>
                        You've completed <span className="sd-insight-hl">{completed.length} assessments</span> with an average score of{' '}
                        <span className="sd-insight-hl">{avgScore}%</span>. Your performance shows consistent engagement across test categories.
                        <br /><br />
                        Keep up the momentum — regular assessment helps track your cognitive growth and identifies areas for improvement.
                      </>
                    ) : (
                      <>
                        Welcome to CogniMap! Start your first assessment to unlock personalised insights about your cognitive profile, personality traits, and interest patterns.
                        <br /><br />
                        Each assessment is designed to help you understand your strengths and guide your development journey.
                      </>
                    )}
                  </div>
                  {reports.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <button className="sd-btn sd-btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => navigate(`/student/reports/${reports[0]?.id}`)}>
                        View full report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
