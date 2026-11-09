'use client';
import {useEffect} from 'react';
export default function PwaRegister(){useEffect(()=>{if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('ForestOS offline shell registration failed.',error));}},[]);return null;}
