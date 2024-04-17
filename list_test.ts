import { assertEquals } from "./test_utils.ts";
import { ArrayList, LinkedList, type List } from "./list.ts";

const testLists = [
  { name: "ArrayList", factory: ArrayList.from<number> },
  { name: "LinkedList", factory: LinkedList.from<number> },
];

for (const { name, factory } of testLists) {
  Deno.test(`${name} - push and pop`, () => {
    let list = factory([]).push(1).push(2).push(3);
    const values = [...list];
    assertEquals(values, [1, 2, 3]);

    list = list.pop();
    assertEquals([...list], [1, 2]);

    list = list.pop();
    assertEquals([...list], [1]);

    list = list.pop();
    assertEquals([...list], []);
  });

  Deno.test(`${name} - unshift and shift`, () => {
    let list = factory([]).unshift(1).unshift(2).unshift(3);
    const values = [...list];
    assertEquals(values, [3, 2, 1]);

    list = list.shift();
    assertEquals([...list], [2, 1]);

    list = list.shift();
    assertEquals([...list], [1]);

    list = list.shift();
    assertEquals([...list], []);
  });

  Deno.test(`${name} - join`, () => {
    const list1 = factory([1, 2, 3]);
    const list2 = factory([4, 5, 6]);
    const joinedList = (list1 as List<number>).join(list2 as List<number>);
    assertEquals([...joinedList], [1, 2, 3, 4, 5, 6]);
  });

  Deno.test(`${name} - split`, () => {
    const list = factory([1, 2, 3, 4, 5]);
    const [list1, splitValue, list2] = list.split((value) => value === 3);
    assertEquals([...list1], [1, 2]);
    assertEquals(splitValue, 3);
    assertEquals([...list2], [4, 5]);
  });

  Deno.test(`${name} - isEmpty`, () => {
    const emptyList = factory([]);
    assertEquals(emptyList.isEmpty(), true);

    const nonEmptyList = factory([1]);
    assertEquals(nonEmptyList.isEmpty(), false);
  });

  Deno.test(`${name} - find`, () => {
    const list = factory([1, 2, 3, 4, 5]);
    const foundValue = list.find((value) => value === 3);
    assertEquals(foundValue, 3);
  });

  Deno.test(`${name} - peek`, () => {
    const list = factory([1, 2, 3]);
    const peekValue = list.first();
    assertEquals(peekValue, 1);
  });

  Deno.test(`${name} - peek`, () => {
    const list = factory([1, 2, 3]);
    const peekValue = list.last();
    assertEquals(peekValue, 3);
  });
}

Deno.test("LinkedList - empty tail pop", () => {
  const list = LinkedList.from<number>([1]);
  const last = list.last();
  const empty = list.pop();
  assertEquals(last, 1);
  assertEquals(empty.head, undefined);
  assertEquals(empty.tail, undefined);
});

Deno.test("LinkedList - empty tail shift", () => {
  const list = LinkedList.from<number>([1]);
  const first = list.first();
  const empty = list.shift();
  assertEquals(first, 1);
  assertEquals(empty.head, undefined);
  assertEquals(empty.tail, undefined);
});
