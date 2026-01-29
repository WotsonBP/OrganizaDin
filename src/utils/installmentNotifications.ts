/**
 * Notificação no final do mês: avisa quando falta 1 parcela para acabar
 * alguma compra (ex.: em fevereiro finaliza a última parcela de "TV").
 */

import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { getAll } from '../database';
import { getMonthName } from './index';

const LAST_NOTIFIED_MONTH_KEY = 'organizadin_last_installment_notification_month';

/** Canal Android para notificações do app */
const CHANNEL_ID = 'organizadin-installments';

export interface PurchaseEndingNextMonth {
  id: number;
  description: string;
  due_date: string;
}

/**
 * Retorna compras que têm exatamente 1 parcela pendente e essa parcela
 * vence no mês informado (YYYY-MM).
 */
export async function getPurchasesEndingInMonth(
  yearMonth: string
): Promise<PurchaseEndingNextMonth[]> {
  const rows = await getAll<{ purchase_id: number; description: string; due_date: string }>(
    `SELECT cp.id as purchase_id, cp.description, i.due_date
     FROM credit_purchases cp
     JOIN installments i ON i.purchase_id = cp.id AND i.status = 'pending'
     WHERE strftime('%Y-%m', i.due_date) = ?
     AND (SELECT COUNT(*) FROM installments i2 WHERE i2.purchase_id = cp.id AND i2.status = 'pending') = 1`,
    [yearMonth]
  );
  return rows.map(r => ({ id: r.purchase_id, description: r.description, due_date: r.due_date }));
}

/**
 * Verifica se estamos nos últimos dias do mês (a partir do dia 28).
 */
export function isEndOfMonth(): boolean {
  const day = new Date().getDate();
  return day >= 28;
}

/**
 * Retorna o mês atual no formato YYYY-MM.
 */
export function getCurrentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Retorna o próximo mês no formato YYYY-MM.
 */
export function getNextYearMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

/**
 * Configura o canal de notificação no Android e solicita permissão.
 */
export async function setupNotificationChannel(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return false;
    }

    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Parcelas',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Lembretes de parcelas que estão para acabar',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Exibe notificação local com as compras que finalizam no próximo mês.
 * Só notifica uma vez por mês (usa SecureStore para lembrar).
 */
export async function checkAndNotifyLastInstallment(): Promise<void> {
  if (!isEndOfMonth()) {
    return;
  }

  const currentMonth = getCurrentYearMonth();
  try {
    const lastNotified = await SecureStore.getItemAsync(LAST_NOTIFIED_MONTH_KEY);
    if (lastNotified === currentMonth) {
      return;
    }
  } catch {
    return;
  }

  const nextMonth = getNextYearMonth();
  const purchases = await getPurchasesEndingInMonth(nextMonth);
  if (purchases.length === 0) {
    return;
  }

  const hasPermission = await setupNotificationChannel();
  if (!hasPermission) {
    return;
  }

  const nextDate = new Date(nextMonth + '-01');
  const monthName = getMonthName(nextDate.getMonth());
  const descriptions =
    purchases.length === 1
      ? purchases[0].description
      : purchases.map(p => p.description).join(', ');

  const body =
    purchases.length === 1
      ? `Em ${monthName} você finaliza a última parcela de: ${descriptions}`
      : `Em ${monthName} você finaliza a última parcela de: ${descriptions}`;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Última parcela no próximo mês',
        body,
        data: { type: 'last_installment_next_month' },
      },
      trigger: null,
    });
    await SecureStore.setItemAsync(LAST_NOTIFIED_MONTH_KEY, currentMonth);
  } catch {
    // Ignora falha ao agendar
  }
}
