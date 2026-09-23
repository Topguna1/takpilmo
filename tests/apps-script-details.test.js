import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

describe('Apps Script overview field contract', () => {
  it('serializes the details sheet fields without requiring optional fields', () => {
    const context=vm.createContext({});
    vm.runInContext(readFileSync('scripts/google-apps-script/Code.gs','utf8'),context);
    const result=context.createDetailsMap_([{key:'example',detailDesc:'기존 소개',mainUses:'개념 학습\n문제 풀이',recommendedFor:'중학생·교사',fee:'기본 무료',signup:'저장 시 가입',operatorName:'테스트 기관',operatorType:'private',sourceUrl:'https://example.com/about',verifiedAt:'2026-09-13',signupAge:'만 14세 이상'}, {key:'legacy',detailDesc:'기존 항목'}]);
    expect(result.example).toMatchObject({mainUses:['개념 학습','문제 풀이'],recommendedFor:'중학생·교사',fee:'기본 무료',signup:'저장 시 가입',operatorName:'테스트 기관',operatorType:'private',sourceUrl:'https://example.com/about',verifiedAt:'2026-09-13',signupAge:'만 14세 이상'});
    expect(result.legacy).toMatchObject({detailDesc:'기존 항목',mainUses:[],fee:''});
  });
});
