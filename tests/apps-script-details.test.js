import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { normalizeCatalog } from '../js/data/sheet-catalog.module.js';

describe('Apps Script overview field contract', () => {
  const readRows = (values) => {
    const context = vm.createContext({});
    vm.runInContext(readFileSync('scripts/google-apps-script/Code.gs', 'utf8'), context);
    return context.readRows_({getSheetByName: () => ({getDataRange: () => ({getValues: () => values})})}, 'sites');
  };

  it('reads a sites table with empty rows before its headers', () => {
    const headers = ['key', 'name', 'url', 'category', 'enabled'];
    const rows = [
      ['EBS', 'EBS', 'https://www.ebs.co.kr/', 'learning', true],
      ['hidden', 'Hidden', 'https://example.com/', 'learning', false],
      ['blank-enabled', 'Blank enabled', 'https://example.com/', 'learning', ''],
    ];
    const expected = readRows([headers, ...rows]);
    expect(readRows([[], ['', '  ', null], headers, ...rows, []])).toEqual(expected);
    expect(expected.map(row => row.key)).toEqual(['EBS', 'blank-enabled']);
    expect(expected[0]).toMatchObject({name: 'EBS', category: 'learning', enabled: true});
  });

  it('returns no rows for an empty sheet without treating whitespace as a header', () => {
    expect(readRows([])).toEqual([]);
    expect(readRows([[''], [' ', null]])).toEqual([]);
  });

  it('serves a catalog the frontend can load when sites headers start on row two', () => {
    const sheets = {
      categories: [['key', 'name'], ['learning', '온라인강의']],
      sites: [[], ['key', 'name', 'url', 'category', 'enabled'], ['EBS', 'EBS', 'https://www.ebs.co.kr/', 'learning', true]],
      details: [['key', 'detailDesc'], ['EBS', '현재 시트의 소개']],
    };
    const context = vm.createContext({
      SpreadsheetApp: {openById: () => ({getSheetByName: name => sheets[name] ? {getDataRange: () => ({getValues: () => sheets[name]})} : null})},
      ContentService: {MimeType: {JSON: 'application/json'}, createTextOutput: content => ({content, setMimeType() {return this;}})},
    });
    vm.runInContext(readFileSync('scripts/google-apps-script/Code.gs', 'utf8'), context);
    const catalog = normalizeCatalog(JSON.parse(context.doGet().content));
    expect(catalog.sites.map(site => site.key)).toEqual(['EBS']);
    expect(catalog.details.EBS.detailDesc).toBe('현재 시트의 소개');
    expect(catalog.warnings).toEqual([]);
  });

  it('serializes the details sheet fields without requiring optional fields', () => {
    const context=vm.createContext({});
    vm.runInContext(readFileSync('scripts/google-apps-script/Code.gs','utf8'),context);
    const result=context.createDetailsMap_([{key:'example',detailDesc:'기존 소개',mainUses:'개념 학습\n문제 풀이',recommendedFor:'중학생·교사',fee:'기본 무료',signup:'저장 시 가입',operatorName:'테스트 기관',operatorType:'private',sourceUrl:'https://example.com/about',verifiedAt:'2026-09-13',signupAge:'만 14세 이상'}, {key:'legacy',detailDesc:'기존 항목'}]);
    expect(result.example).toMatchObject({mainUses:['개념 학습','문제 풀이'],recommendedFor:'중학생·교사',fee:'기본 무료',signup:'저장 시 가입',operatorName:'테스트 기관',operatorType:'private',sourceUrl:'https://example.com/about',verifiedAt:'2026-09-13',signupAge:'만 14세 이상'});
    expect(result.legacy).toMatchObject({detailDesc:'기존 항목',mainUses:[],fee:''});
  });
});
