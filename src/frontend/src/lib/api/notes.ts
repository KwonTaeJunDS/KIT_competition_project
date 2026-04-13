import { ErrorNoteItem, ErrorNoteListResponse } from "../types/api";
import { USE_MOCK, fetchApi } from "./client";
import { mockStore } from "../mock/store";

export async function getErrorNotes(userId: string): Promise<ErrorNoteItem[]> {
  if (USE_MOCK) {
    return mockStore.getNotes();
  }
  
  const data = await fetchApi<ErrorNoteListResponse>(`/api/v1/error-notes?user_id=${userId}`);
  return data.notes; // Extract array from ErrorNoteListResponse
}

export async function getErrorNoteDetail(id: string, userId: string): Promise<ErrorNoteItem> {
  if (USE_MOCK) {
    const notes = mockStore.getNotes();
    const note = notes.find(n => n.id === id) || notes[0];
    return note;
  }

  return fetchApi<ErrorNoteItem>(`/api/v1/error-notes/${id}?user_id=${userId}`);
}
