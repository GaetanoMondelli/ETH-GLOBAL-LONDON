CC=g++
CFLAGS=-std=c++11 -O3 -I.
DEPS_HPP = circom.hpp calcwit.hpp fr.hpp
DEPS_O = main.o calcwit.o fr.o fr_asm.o

ifeq ($(shell uname),Darwin)
	NASM=nasm -fmacho64 --prefix _
endif
ifeq ($(shell uname),Linux)
	NASM=nasm -felf64
endif
	
all: ProcessMessagesNonQv_10-2-1-2_test
	
%.o: %.cpp $(DEPS_HPP)
	$(CC) -c $< $(CFLAGS)

fr_asm.o: fr.asm
	$(NASM) fr.asm -o fr_asm.o
	
ProcessMessagesNonQv_10-2-1-2_test: $(DEPS_O) ProcessMessagesNonQv_10-2-1-2_test.o
	$(CC) -o ProcessMessagesNonQv_10-2-1-2_test *.o -lgmp 
