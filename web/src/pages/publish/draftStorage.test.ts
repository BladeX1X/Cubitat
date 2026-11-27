import { beforeEach, describe, expect, it } from 'vitest'
import {
  getPublicationDraftKey,
  listPublicationDrafts,
  readPublicationDraft,
  removePublicationDraft,
  savePublicationDraft,
} from './draftStorage'

beforeEach(() => localStorage.clear())

describe('publication draft storage isolation', () => {
  it('keeps drafts isolated by authenticated user', () => {
    savePublicationDraft('owner-a', { title: 'Borrador A' })

    expect(readPublicationDraft('owner-a')).toEqual({ title: 'Borrador A' })
    expect(readPublicationDraft('owner-b')).toBeNull()
  })

  it('discards an unscoped legacy draft instead of assigning it to the current user', () => {
    localStorage.setItem('cubitat_publish_draft', JSON.stringify({ title: 'Anterior' }))

    expect(readPublicationDraft('owner-a')).toBeNull()
    expect(localStorage.getItem('cubitat_publish_draft')).toBeNull()
    expect(localStorage.getItem(getPublicationDraftKey('owner-a'))).toBeNull()
  })

  it('clears the unscoped legacy draft even when the current user has a scoped draft', () => {
    localStorage.setItem('cubitat_publish_draft', JSON.stringify({ title: 'Sin dueño' }))
    savePublicationDraft('owner-a', { title: 'Borrador A' })

    expect(readPublicationDraft('owner-a')).toEqual({ title: 'Borrador A' })
    expect(localStorage.getItem('cubitat_publish_draft')).toBeNull()
    expect(readPublicationDraft('owner-b')).toBeNull()
  })

  it('discards a corrupted scoped draft without blocking the form', () => {
    localStorage.setItem(getPublicationDraftKey('owner-a'), '{not-json')

    expect(readPublicationDraft('owner-a')).toBeNull()
    expect(localStorage.getItem(getPublicationDraftKey('owner-a'))).toBeNull()
  })

  it('discards a corrupted legacy draft without migrating it', () => {
    localStorage.setItem('cubitat_publish_draft', '{not-json')

    expect(readPublicationDraft('owner-a')).toBeNull()
    expect(localStorage.getItem('cubitat_publish_draft')).toBeNull()
    expect(localStorage.getItem(getPublicationDraftKey('owner-a'))).toBeNull()
  })

  it('removes only the requested user draft', () => {
    savePublicationDraft('owner-a', { title: 'A' })
    savePublicationDraft('owner-b', { title: 'B' })

    removePublicationDraft('owner-a')

    expect(readPublicationDraft('owner-a')).toBeNull()
    expect(readPublicationDraft('owner-b')).toEqual({ title: 'B' })
  })

  it('keeps multiple drafts for one user and removes only the selected draft', () => {
    savePublicationDraft('owner-a', { title: 'Primero' }, 'draft-1')
    savePublicationDraft('owner-a', { title: 'Segundo' }, 'draft-2')

    expect(listPublicationDrafts('owner-a')).toEqual([
      { id: 'draft-1', formData: { title: 'Primero' } },
      { id: 'draft-2', formData: { title: 'Segundo' } },
    ])

    removePublicationDraft('owner-a', 'draft-1')

    expect(listPublicationDrafts('owner-a')).toEqual([{ id: 'draft-2', formData: { title: 'Segundo' } }])
  })

  it('lists the older account-scoped draft as a resumable legacy entry', () => {
    savePublicationDraft('owner-a', { title: 'Anterior' })

    expect(listPublicationDrafts('owner-a')).toEqual([{ id: 'legacy', formData: { title: 'Anterior' } }])
  })
})
